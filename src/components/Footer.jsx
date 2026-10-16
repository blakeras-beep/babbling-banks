import { EPISODES, SHOW_LIST } from '../data/index.js';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <span>
          {EPISODES.length.toLocaleString()} episodes across {SHOW_LIST.length} shows. Episode
          details are collected from public sources and may contain mistakes.
        </span>
        <span>
          <a
            href="https://github.com/blakeras-beep/babbling-banks"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source on GitHub
          </a>
        </span>
      </div>
    </footer>
  );
}
