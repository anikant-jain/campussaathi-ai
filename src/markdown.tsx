import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

export default function Markdown({content}:{content:string}){
  return <div className="markdown"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex,rehypeHighlight]} components={{
    a:({href,children})=><a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    img:()=>null,
  }}>{content}</ReactMarkdown></div>;
}

