"use client";

import { useChat } from "@ai-sdk/react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  Loader,
  Message,
  MessageContent,
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@repo/design-system/components/ai-elements";
import { DefaultChatTransport, type FileUIPart } from "ai";
import { FileTextIcon } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
// TODO: Create QuizCard component
// import { QuizCard } from "./quiz-card";
import type { QuizData } from "../types";

export const Chat = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat/generate-quiz",
    }),
  });
  const [text, setText] = useState<string>("");

  const handleSubmit = (message: PromptInputMessage) => {
    sendMessage(message);
    setText("");
  };

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1 overflow-auto">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Upload a PDF document and I'll create a quiz based on its content."
              icon={<FileTextIcon className="size-6" />}
              title="Generate a Quiz from PDF"
            />
          ) : (
            <>
              {messages.map((message) => {
                // Look for the generateQuiz tool in message parts
                const quizTool = message.parts.find(
                  (p) => p.type === "tool-generateQuiz"
                );
                const hasQuizTool = !!quizTool;

                // Get text parts for regular messages
                const textContent = message.parts
                  .filter((p) => p.type === "text")
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("");

                return (
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {/* Quiz Tool - Loading State */}
                      {quizTool?.type === "tool-generateQuiz" &&
                        quizTool.state === "input-available" && <Loader />}

                      {/* Quiz Tool - Output Available */}
                      {quizTool?.type === "tool-generateQuiz" &&
                        quizTool.state === "output-available" && (
                          <div className="rounded-lg border p-4">
                            <pre className="text-sm">
                              {JSON.stringify(
                                quizTool.output as QuizData,
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        )}

                      {/* Quiz Tool - Error */}
                      {quizTool?.type === "tool-generateQuiz" &&
                        quizTool.state === "output-error" && (
                          <div className="text-red-500">
                            Error generating quiz: {quizTool.errorText}
                          </div>
                        )}

                      {/* Regular text content (when no quiz tool) */}
                      {!hasQuizTool && textContent && (
                        <span>{textContent}</span>
                      )}
                    </MessageContent>
                  </Message>
                );
              })}
              {(status === "submitted" || status === "streaming") && (
                <Message from="assistant">
                  <MessageContent>
                    <Loader />
                  </MessageContent>
                </Message>
              )}
            </>
          )}
        </ConversationContent>
      </Conversation>
      <PromptInput
        accept="application/pdf"
        globalDrop
        multiple
        onSubmit={handleSubmit}
      >
        <PromptInputHeader>
          <PromptInputAttachments>
            {(attachment: FileUIPart & { id: string }) => (
              <PromptInputAttachment data={attachment} />
            )}
          </PromptInputAttachments>
        </PromptInputHeader>
        <PromptInputBody>
          <PromptInputTextarea
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setText(e.target.value)
            }
            placeholder="Upload a PDF and ask me to generate a quiz..."
            ref={textareaRef}
            value={text}
          />
        </PromptInputBody>
        <PromptInputFooter className="border">
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments label="Add PDF document" />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
          </PromptInputTools>
          <PromptInputSubmit status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
};
