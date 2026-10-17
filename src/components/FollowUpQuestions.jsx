/** "Which show?" and friends: a playful label with the options as text links. */
export default function FollowUpQuestions({ questions, onAnswer }) {
  if (!questions || questions.length === 0) return null;
  return (
    <div className="followups" aria-label="Narrow it down">
      {questions.map((question) => (
        <div key={question.type}>
          <h2 className="section-label">{question.text.toLowerCase()}</h2>
          <ul className="examples">
            {question.options.map((option) => (
              <li key={`${question.type}-${option.label}`}>
                <button
                  type="button"
                  className="example-link"
                  onClick={() => onAnswer(question.type, option.value)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
