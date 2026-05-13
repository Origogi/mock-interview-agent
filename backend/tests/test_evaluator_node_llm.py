import json
import os
import sys
from pathlib import Path

import pytest
from dotenv import load_dotenv


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

load_dotenv()

pytestmark = [
    pytest.mark.llm,
    pytest.mark.skipif(
        os.getenv("RUN_LLM_TESTS") != "1",
        reason="LLM integration tests are opt-in. Set RUN_LLM_TESTS=1 to run.",
    ),
    pytest.mark.skipif(
        not os.getenv("OPENAI_API_KEY"),
        reason="OPENAI_API_KEY is required for LLM integration tests.",
    ),
]


QUESTION = (
    "결제 승인 후 주문 생성 단계에서 장애가 발생하면 결제는 성공했지만 주문은 없는 "
    "불일치 상태가 생길 수 있습니다. 이 문제를 어떻게 설계로 방지하고 운영 중 감지하겠습니까?"
)

EXPECTED_SCORE_RANGES = {
    "best": (7, 10),
    "good": (5, 6),
    "bad": (1, 4),
}

TIER_CASES = {
    "best": [
        {
            "id": "best_outbox_idempotency",
            "answer": (
                "외부 PG 호출과 주문 DB 트랜잭션을 같은 원자성으로 묶기 어렵기 때문에, 결제 요청마다 "
                "idempotency key를 발급하고 주문 상태를 PENDING_PAYMENT, PAID, ORDER_CREATED로 나눕니다. "
                "결제 성공 이벤트는 같은 DB 트랜잭션에서 outbox에 저장하고 워커가 발행합니다. 워커는 "
                "exponential backoff로 재시도하고 DLQ를 둡니다. 주문 생성은 payment_id unique constraint로 "
                "중복을 막고, 결제 성공 후 주문 없음 상태가 5분 이상 지속되는 건수를 메트릭과 알림으로 봅니다."
            ),
        },
        {
            "id": "best_saga_compensation",
            "answer": (
                "상태 머신과 saga로 설계하겠습니다. 결제는 먼저 AUTH 또는 PAID_PENDING_ORDER 상태로 기록하고, "
                "주문 생성 성공 시 ORDER_CREATED로 전이합니다. 실패하면 재시도 가능한 오류와 불가능한 오류를 "
                "나눠 재시도 큐 또는 보상 환불 플로우로 보냅니다. 각 전이는 transaction log에 남기고 correlation_id로 "
                "분산 tracing을 연결합니다. 운영에서는 상태별 체류 시간, 보상 트랜잭션 건수, 재시도 실패율을 대시보드와 "
                "알림 임계값으로 관리하겠습니다."
            ),
        },
        {
            "id": "best_reconciliation",
            "answer": (
                "요청 경로에서는 payment_id 기준 idempotent command로 주문 생성을 처리하고, DB에는 payment_id에 "
                "unique index를 둡니다. 결제 성공과 주문 생성 사이에 장애가 나면 이벤트 outbox에 남은 레코드를 "
                "워커가 재처리합니다. 별도로 PG 정산 API와 내부 주문 테이블을 주기적으로 대조하는 reconciliation job을 "
                "두어 누락 결제를 찾아냅니다. 발견된 항목은 자동 재처리 후 실패 시 운영 큐로 보내고, SLO 기준으로 "
                "미해결 건수와 aging을 추적합니다."
            ),
        },
        {
            "id": "best_transaction_boundary",
            "answer": (
                "핵심은 트랜잭션 경계를 명확히 하는 것입니다. PG 승인 결과를 받은 뒤 내부 DB에는 결제 성공 사실과 "
                "주문 생성 명령을 한 트랜잭션으로 저장하고, 실제 비동기 처리는 outbox relay가 담당하게 합니다. "
                "relay가 중복 실행되어도 주문 생성 handler는 idempotent하게 만들고 optimistic lock이나 unique key로 "
                "중복을 차단합니다. 장애 감지는 orphan payment count, outbox lag, DLQ count를 지표화하고, "
                "runbook에는 자동 복구와 수동 개입 조건을 나눠 둡니다."
            ),
        },
        {
            "id": "best_user_impact",
            "answer": (
                "사용자 영향까지 고려하면 결제 직후 바로 주문 완료를 확정하지 않고, 내부적으로 ORDER_CREATING 같은 "
                "중간 상태를 둡니다. 주문 생성 실패 시 사용자에게는 확인 중 상태를 보여주고 백엔드에서는 idempotency key로 "
                "안전하게 재시도합니다. 성공/실패 전이는 감사 로그에 남기고, 최종 실패 시 보상 환불 이벤트를 발행합니다. "
                "운영에서는 결제 성공 대비 주문 생성 성공률, 중간 상태 체류 시간, 환불 보상 발생률을 알림 기준으로 잡아 "
                "장애를 빠르게 감지하겠습니다."
            ),
        },
    ],
    "good": [
        {
            "id": "good_unique_retry",
            "answer": (
                "결제 번호를 주문에 저장해서 같은 결제가 여러 주문으로 만들어지지 않게 하겠습니다. 주문 생성에 실패하면 "
                "재시도 배치가 다시 처리하고, 그래도 실패하면 운영자가 볼 수 있게 로그와 알림을 남기겠습니다. "
                "상태값도 결제 완료, 주문 생성 실패 정도로 나누겠습니다. 다만 외부 PG 호출과 DB 저장 사이의 "
                "트랜잭션 경계나 구체적인 재시도 정책은 더 설계해야 합니다."
            ),
        },
        {
            "id": "good_status_batch",
            "answer": (
                "주문 상태를 결제 완료와 주문 생성 완료로 나눠서 저장하겠습니다. 결제 완료인데 주문 생성 완료가 아닌 "
                "데이터는 배치가 찾아서 재처리합니다. 중복 처리를 막기 위해 결제 ID를 기준으로 확인하고, 실패하면 "
                "알림을 보내겠습니다. 구체적으로 메시지 큐나 outbox를 쓸지는 시스템 규모에 따라 판단하겠습니다."
            ),
        },
        {
            "id": "good_queue_retry",
            "answer": (
                "결제 성공 후 바로 주문을 만들기보다 큐에 주문 생성 요청을 넣고 워커가 처리하게 하겠습니다. 워커가 실패하면 "
                "몇 번 재시도하고, 계속 실패하면 별도 실패 테이블에 저장해서 운영자가 확인합니다. 이런 방식이면 서버가 "
                "잠깐 죽어도 다시 처리할 수 있습니다. 다만 중복 메시지 처리나 정확한 보상 로직은 답변에서 더 구체화가 필요합니다."
            ),
        },
        {
            "id": "good_monitoring_reprocess",
            "answer": (
                "결제 성공 로그와 주문 테이블을 비교해서 결제는 있는데 주문이 없는 케이스를 찾겠습니다. 일정 시간 이상 "
                "누락되면 알림을 만들고, 재처리 API로 주문을 다시 생성합니다. 고객 문의 전에 발견할 수 있도록 모니터링을 "
                "두겠습니다. 다만 장애를 예방하는 설계보다는 사후 탐지와 재처리에 더 치우친 답변입니다."
            ),
        },
        {
            "id": "good_error_handling",
            "answer": (
                "결제 성공 이후 주문 생성에서 예외가 나면 실패 상태를 저장하고 재시도하도록 하겠습니다. 실패 상태가 계속 "
                "남아 있으면 알림을 보내고 수동 처리할 수 있게 합니다. 중복 주문은 결제 ID로 한 번 더 조회해서 막겠습니다. "
                "구체적인 락, unique constraint, 이벤트 발행 방식까지는 아직 설명하지 못하겠습니다."
            ),
        },
    ],
    "bad": [
        {
            "id": "bad_manual_db",
            "answer": (
                "잘 모르겠습니다. 결제는 됐는데 주문이 없으면 고객이 문의했을 때 운영자가 DB를 확인해서 수동으로 주문을 "
                "넣거나 환불하면 될 것 같습니다. 평소에는 try-catch로 에러만 잡고 서버를 재시작하면 대부분 해결될 것 같습니다."
            ),
        },
        {
            "id": "bad_log_only",
            "answer": (
                "일단 로그를 많이 남기고 문제가 생기면 로그를 보고 고치겠습니다. 결제와 주문 코드에 예외 처리를 추가하면 "
                "장애가 줄어들 것 같습니다. 특별한 설계보다는 개발자가 주의해서 구현하면 될 것 같습니다."
            ),
        },
        {
            "id": "bad_refund_all",
            "answer": (
                "주문 생성에 실패하면 그냥 결제를 모두 취소하면 됩니다. 주문이 없는 결제는 나중에 고객에게 안내하면 되고, "
                "시스템적으로 복잡하게 만들 필요는 없을 것 같습니다. 결제 성공 여부만 확인하면 충분합니다."
            ),
        },
        {
            "id": "bad_pg_handles_it",
            "answer": (
                "PG사가 결제를 처리하니까 불일치 문제는 거의 없을 것 같습니다. 혹시 문제가 생기면 PG 관리자 페이지에서 "
                "확인하고 주문을 다시 만들면 됩니다. 백엔드에서는 에러 메시지만 잘 보여주면 된다고 생각합니다."
            ),
        },
        {
            "id": "bad_restart_retry",
            "answer": (
                "장애가 발생하면 서버를 재시작하고 다시 요청을 보내면 됩니다. 주문이 안 만들어진 건은 운영팀이 엑셀로 "
                "정리해서 처리하면 될 것 같습니다. 별도의 모니터링은 로그 파일을 보면 충분합니다."
            ),
        },
    ],
}

EVALUATOR_CASES = tuple(
    pytest.param(tier, case, id=case["id"])
    for tier, cases in TIER_CASES.items()
    for case in cases
)


def _score_tier(score: int) -> str:
    if score >= 7:
        return "best"
    if score >= 5:
        return "good"
    return "bad"


def _evaluate(answer: str) -> dict:
    from langchain_core.messages import AIMessage, HumanMessage

    from agent import evaluator_node

    result = evaluator_node(
        {
            "resume_summary": {},
            "messages": [
                AIMessage(content=QUESTION),
                HumanMessage(content=answer),
            ],
            "question_count": 1,
            "max_questions": 5,
            "evaluations": [],
            "final_report": None,
        }
    )

    assert set(result.keys()) == {"evaluations"}
    assert len(result["evaluations"]) == 1

    evaluation = result["evaluations"][0]
    assert evaluation["question"] == QUESTION
    assert evaluation["answer"] == answer
    assert isinstance(evaluation["score"], int)
    assert 1 <= evaluation["score"] <= 10
    assert isinstance(evaluation["feedback"], str)
    assert evaluation["feedback"].strip()
    return evaluation


def _judge_case(expected_tier: str, case: dict, evaluation: dict):
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_openai import ChatOpenAI
    from pydantic import BaseModel, Field

    class JudgeVerdict(BaseModel):
        answer_matches_expected_tier: bool = Field(
            description="True when the answer quality matches the expected best/good/bad tier."
        )
        feedback_is_actionable: bool = Field(
            description="True when evaluator feedback includes concrete strengths or improvements."
        )
        score_is_reasonable: bool = Field(
            description="True when the evaluator score fits the expected canonical tier range."
        )
        should_fail_test: bool = Field(
            description="True when this case should fail because the evaluator judgment is not acceptable."
        )
        reason: str = Field(description="Brief explanation of the case-level judgment.")

    judge_model = os.getenv("EVAL_JUDGE_MODEL", "gpt-4o-mini")
    judge_prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are an AI judge validating one technical interview answer evaluation. "
                "Use the provided context and return the requested structured verdict.",
            ),
            (
                "human",
                "\n".join(
                    [
                        "Question:",
                        "{question}",
                        "",
                        "Canonical score tiers:",
                        "{canonical_score_tiers}",
                        "",
                        "Expected tier:",
                        "{expected_tier}",
                        "",
                        "Candidate answer:",
                        "{answer}",
                        "",
                        "Evaluator output:",
                        "{evaluation}",
                        "",
                        "Judge criteria:",
                        "- best means strong, concrete design with tradeoffs and operational detection; expected score 7-10.",
                        "- good means directionally correct but missing depth, concrete mechanisms, or tradeoffs; expected score 5-6.",
                        "- bad means vague, manual, or structurally unsafe; expected score 1-4.",
                        "- Feedback should explain why the score was assigned and include concrete improvement points.",
                    ]
                ),
            ),
        ]
    )
    judge_chain = judge_prompt | ChatOpenAI(
        model=judge_model,
        temperature=0,
    ).with_structured_output(JudgeVerdict)

    verdict = judge_chain.invoke(
        {
            "question": QUESTION,
            "canonical_score_tiers": json.dumps(EXPECTED_SCORE_RANGES, ensure_ascii=False),
            "expected_tier": expected_tier,
            "answer": case["answer"],
            "evaluation": json.dumps(evaluation, ensure_ascii=False, indent=2),
        }
    )
    return verdict


@pytest.mark.parametrize("expected_tier, case", EVALUATOR_CASES)
def test_evaluator_scores_each_answer_in_expected_tier(expected_tier, case):
    evaluation = _evaluate(case["answer"])
    min_score, max_score = EXPECTED_SCORE_RANGES[expected_tier]

    assert min_score <= evaluation["score"] <= max_score, {
        "case_id": case["id"],
        "expected_tier": expected_tier,
        "expected_range": (min_score, max_score),
        "observed_tier": _score_tier(evaluation["score"]),
        "score": evaluation["score"],
        "feedback": evaluation["feedback"],
    }
    assert _score_tier(evaluation["score"]) == expected_tier

    verdict = _judge_case(expected_tier, case, evaluation)
    assert verdict.answer_matches_expected_tier is True, verdict
    assert verdict.feedback_is_actionable is True, verdict
    assert verdict.score_is_reasonable is True, verdict
    assert verdict.should_fail_test is False, verdict
