import React from 'react';
import type { Message } from '../../types/chat';
import { LogoIcon } from '../brand/Logo';
import MarkdownContent from './MarkdownContent';

interface MessageProps {
  message: Message;
}

const MessageComponent: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
            isUser ? 'bg-primary-500 text-white' : 'bg-primary-50'
          }`}
          aria-hidden="true"
        >
          {isUser ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <LogoIcon size={22} />
          )}
        </div>

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`text-xs text-gray-500 mb-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {isUser ? 'You' : 'AI Assistant'}
          </div>

          <div
            className={`relative px-4 py-3 rounded-2xl max-w-full ${
              isUser
                ? 'bg-primary-500 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
            }`}
          >
            <MarkdownContent content={message.content} />
          </div>

          <div className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageComponent;
