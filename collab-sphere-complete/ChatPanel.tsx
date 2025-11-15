import React, { useState, useRef, useEffect } from 'react';
import { Participant, Message, MessageType, TextContent, FileContent } from './types';
import { SUPPORTED_LANGUAGES, EMOJI_CATEGORIES } from './constants';
import { translateText, correctGrammar, filterProfanity } from './geminiService';

interface ChatPanelProps {
  currentUser: Participant;
  messages: Message[];
  onAddMessage: (message: Message) => void;
  onEditMessage: (messageId: string, newContent: Message['content']) => void;
  onDeleteMessage: (messageId: string) => void;
  isChatMuted: boolean;
  arePMsDisabled: boolean;
  participants: Participant[];
  isProfanityFilterEnabled: boolean;
  fileObjectURLs: Map<string, string>;
}

const ChatPanel: React.FC<ChatPanelProps> = (props) => {
  const { currentUser, messages, onAddMessage, onEditMessage, onDeleteMessage, isChatMuted, arePMsDisabled, participants, isProfanityFilterEnabled, fileObjectURLs } = props;
  
  const [text, setText] = useState('');
  const [targetLang, setTargetLang] = useState<string>('en');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const handleCorrectGrammar = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    const correctedText = await correctGrammar(text);
    setText(correctedText);
    setIsProcessing(false);
  };
  
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };
  
  const handleSaveEdit = () => {
    if (!editingMessageId || !editingText.trim()) return;
    const newContent: TextContent = { originalText: editingText.trim() };
    onEditMessage(editingMessageId, newContent);
    handleCancelEdit();
  };
  
  const startEditing = (message: Message) => {
    if (message.type !== MessageType.TEXT) return;
    setEditingMessageId(message.id);
    setEditingText((message.content as TextContent).originalText);
  };

  const handleSendMessage = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);

    let finalText = text;
    if (isProfanityFilterEnabled) {
        finalText = await filterProfanity(text);
    }
    
    const targetLanguageName = SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || 'English';
    const translated = await translateText(finalText, targetLanguageName);
    
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      type: MessageType.TEXT,
      content: {
        originalText: finalText,
        translatedText: translated,
        targetLanguage: targetLanguageName,
      } as TextContent,
      isPrivate: recipientIds.length > 0,
      recipientIds: recipientIds.length > 0 ? recipientIds : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    onAddMessage(newMessage);
    setText('');
    setIsProcessing(false);
  };
  
  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isAudio = file.type.startsWith('audio/');
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        type: isAudio ? MessageType.AUDIO : MessageType.FILE,
        content: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            file: file,
        } as FileContent,
        isPrivate: recipientIds.length > 0,
        recipientIds: recipientIds.length > 0 ? recipientIds : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      onAddMessage(newMessage);
      event.target.value = ''; // Reset file input
    }
  };
  
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const renderMessageContent = (msg: Message) => {
    const url = fileObjectURLs.get(msg.id);
    
    switch (msg.type) {
      case MessageType.TEXT:
        const { originalText, translatedText, targetLanguage } = msg.content as TextContent;
        return (
          <>
            <p className="text-base whitespace-pre-wrap">{originalText}</p>
            {translatedText && originalText.toLowerCase() !== translatedText.toLowerCase() && (
              <p className="text-sm text-gray-300 italic border-t border-gray-500 mt-2 pt-1">
                ({targetLanguage}): {translatedText}
              </p>
            )}
            {msg.isEdited && <span className="text-xs text-gray-400 ml-2">(edited)</span>}
          </>
        );
      case MessageType.FILE:
      case MessageType.AUDIO:
        const { fileName, fileSize } = msg.content as FileContent;
        return (
          <div className="p-2 bg-black/20 rounded-md w-64">
            <p className="font-semibold text-sm truncate">{fileName}</p>
            <p className="text-xs text-dark-text-secondary mb-2">{formatBytes(fileSize)}</p>
            {msg.type === MessageType.AUDIO && url && <audio src={url} controls className="w-full h-10" />}
            {url ? (
                 <a href={url} download={fileName} className="text-sm text-blue-300 hover:underline">Download</a>
            ) : (
                <span className="text-sm text-gray-500">Processing...</span>
            )}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-4 border-b border-dark-border flex justify-between items-center flex-shrink-0">
        <h2 className="font-bold text-lg">Chat</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isOwnMessage = msg.senderId === currentUser.id;
          if (msg.isPrivate && msg.senderId !== currentUser.id && !msg.recipientIds?.includes(currentUser.id)) return null;

          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
              <div className={`rounded-lg p-3 max-w-sm relative group ${isOwnMessage ? 'bg-brand-secondary' : 'bg-dark-border'}`}>
                <div className="flex items-center text-sm mb-1">
                  <span className="font-bold mr-2">{msg.senderName}</span>
                  <span className="text-gray-400 ml-auto">{msg.timestamp}</span>
                </div>
                {editingMessageId === msg.id ? (
                    <div>
                        <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} className="w-full bg-dark-bg p-2 rounded-md text-white"></textarea>
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={handleCancelEdit} className="text-xs p-1">Cancel</button>
                            <button onClick={handleSaveEdit} className="text-xs bg-green-600 p-1 rounded">Save</button>
                        </div>
                    </div>
                ) : renderMessageContent(msg)}
              </div>
               <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isOwnMessage && msg.type === MessageType.TEXT && editingMessageId !== msg.id && (
                        <button onClick={() => startEditing(msg)} title="Edit" className="p-1 rounded-full bg-dark-border hover:bg-gray-600">✏️</button>
                    )}
                    {currentUser.isHost && (
                        <button onClick={() => onDeleteMessage(msg.id)} title="Delete" className="p-1 rounded-full bg-dark-border hover:bg-red-600">🗑️</button>
                    )}
                </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {isChatMuted && <div className="p-2 text-center bg-red-900 text-sm flex-shrink-0">Chat is muted by the host.</div>}
      
      <div className="p-4 border-t border-dark-border bg-dark-surface flex-shrink-0">
        <div className="flex items-center space-x-2 relative">
          <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isChatMuted} className="p-2 rounded-md hover:bg-dark-border disabled:opacity-50" title="Attach File">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a3 3 0 006 0V7a1 1 0 112 0v4a5 5 0 01-10 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" /></svg>
          </button>
          <div ref={emojiPickerRef} className="relative">
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={isChatMuted} className="p-2 rounded-md hover:bg-dark-border disabled:opacity-50" title="Add Emoji">😊</button>
            {showEmojiPicker && <EmojiPicker onSelect={(emoji) => { setText(t => t + emoji); setShowEmojiPicker(false); }} />}
          </div>
          <button onClick={handleCorrectGrammar} disabled={isChatMuted || isProcessing || !text.trim()} className="p-2 rounded-md hover:bg-dark-border disabled:opacity-50" title="Correct Grammar">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
          </button>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isChatMuted ? "Chat is muted" : "Type a message..."}
            className="flex-1 bg-dark-border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            disabled={isChatMuted || isProcessing}
          />
          <button onClick={handleSendMessage} disabled={isChatMuted || isProcessing || !text.trim()} className="bg-brand-secondary text-white p-2 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed">
            {isProcessing ? 
              (<svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) :
              (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009.894 15V4.106A1 1 0 0010.894 2.553z" /></svg>)
            }
          </button>
        </div>
      </div>
    </div>
  );
};

const EmojiPicker: React.FC<{onSelect: (emoji: string) => void}> = ({ onSelect }) => {
    const [activeCategory, setActiveCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0]);

    return (
        <div className="absolute bottom-full mb-2 w-72 h-80 bg-dark-surface border border-dark-border rounded-lg flex flex-col z-30">
            <div className="flex-1 p-2 grid grid-cols-8 gap-1 overflow-y-auto">
                {(EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES]).map(emoji => (
                    <button key={emoji} onClick={() => onSelect(emoji)} className="text-2xl rounded-md hover:bg-dark-border aspect-square">{emoji}</button>
                ))}
            </div>
            <div className="grid grid-cols-4 gap-1 p-1 border-t border-dark-border">
                {Object.keys(EMOJI_CATEGORIES).map((category, index) => (
                    <button key={category} onClick={() => setActiveCategory(category)} className={`p-2 text-xl rounded-md ${activeCategory === category ? 'bg-brand-secondary' : 'hover:bg-dark-border'}`}>
                        {['😀', '👋', '❤️', '⌚️'][index]}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default ChatPanel;
