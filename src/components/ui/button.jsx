import React from "react";

export function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition ${className}`}
    >
      {children}
    </button>
  );
}