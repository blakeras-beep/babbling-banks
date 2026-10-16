export default function FollowUpQuestions({ questions, onAnswer }) {
  if (!questions || questions.length === 0) return null;
  return (
    <div className="followups" aria-label="Narrow it down">
      {questions.map((question) => (
        <div key={question.type}>
          <div className="followups__question">{question.text}</div>
          <div className="chip-row">
            {question.options.map((option) => (
              <button
                type="button"
                className="chip chip--small"
                key={`${question.type}-${option.label}`}
                onClick={() => onAnswer(question.type, option.value)}
              >
                <span aria-hidden="true">{option.emoji}</span> {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
