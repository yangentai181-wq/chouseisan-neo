"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import type { EventTemplate, EventMode, CandidatePattern } from "@/types";
import {
  getTemplates,
  deleteTemplate,
  generateCandidatesFromPattern,
  describePattern,
} from "@/lib/templates";

interface TemplateSelectorProps {
  onSelect: (template: {
    title: string;
    description: string;
    mode: EventMode;
    duration_minutes: number | null;
    candidates: {
      date: string;
      start_time: string | null;
      end_time: string | null;
    }[];
  }) => void;
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<EventTemplate[]>([]);

  useEffect(() => {
    setTemplates(getTemplates());
  }, []);

  const handleSelect = (template: EventTemplate) => {
    const candidates = generateCandidatesFromPattern(
      template.candidate_pattern,
    );
    onSelect({
      title: template.title,
      description: template.description,
      mode: template.mode,
      duration_minutes: template.duration_minutes,
      candidates,
    });
    setIsOpen(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("このテンプレートを削除しますか？")) {
      deleteTemplate(id);
      setTemplates(getTemplates());
    }
  };

  if (templates.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </svg>
        テンプレートから作成
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => handleSelect(template)}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <div>
                <p className="font-medium text-slate-900">{template.name}</p>
                <p className="text-sm text-slate-500">
                  {template.candidate_pattern.map(describePattern).join("、")}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => handleDelete(template.id, e)}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
