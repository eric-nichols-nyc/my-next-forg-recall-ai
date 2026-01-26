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
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@repo/design-system/components/ai-elements";
import { MessageResponse } from "@repo/design-system/components/ai-elements/message";
import { DefaultChatTransport } from "ai";
import { MessageSquareIcon } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";

type ChatProps = {
  noteContext?: string;
};

export const Chat = ({ noteContext }: ChatProps = {}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: noteContext ? { noteContext } : undefined,
    }),
  });
  const [text, setText] = useState<string>("");

  const handleSubmit = (message: PromptInputMessage) => {
    sendMessage(message);
    setText("");
  };

  return (
    <div className="flex h-full flex-col bg-neutral-900">
      <Conversation className="flex-1 overflow-auto">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              description={
                noteContext
                  ? "Ask me questions about the document on the left."
                  : "Start a conversation or provide context to discuss."
              }
              icon={<MessageSquareIcon className="size-6" />}
              title={noteContext ? "Chat about your note" : "Start chatting"}
            />
          ) : (
            <>
              {messages.map((message) => {
                // Get text content from message
                const textContent = message.parts
                  .filter((p) => p.type === "text")
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("");

                if (!textContent) {
                  return null;
                }

                return (
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {message.role === "assistant" ? (
                        <MessageResponse>{textContent}</MessageResponse>
                      ) : (
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
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputBody>
          <PromptInputTextarea
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setText(e.target.value)
            }
            placeholder={
              noteContext
                ? "Ask me questions about the document..."
                : "Type your message..."
            }
            ref={textareaRef}
            value={text}
          />
        </PromptInputBody>
        <PromptInputFooter className="border">
          <PromptInputSubmit status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
};
