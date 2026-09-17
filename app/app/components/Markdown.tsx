import React from "react";
import ReactMarkdown from "react-markdown";

export default function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        strong: ({node, ...props}) => <strong className="font-bold text-black dark:text-white" {...props} />,
        b: ({node, ...props}) => <b className="font-bold text-black dark:text-white" {...props} />,
        // Puedes personalizar más etiquetas aquí
      }}
      // linkTarget removed in react-markdown v9+
      skipHtml={false}
    >
      {children}
    </ReactMarkdown>
  );
}

