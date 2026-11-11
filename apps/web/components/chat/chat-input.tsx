import React, { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
    const [message, setMessage] = useState('');

    const handleSend = () => {
        if (message.trim()) {
            onSend(message);
            setMessage('');
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="p-3 border-t border-border bg-card">
            <div className="flex gap-2">
                <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 bg-background border-border focus-visible:ring-accent text-foreground placeholder:text-muted-foreground"
                    disabled={disabled}
                    autoComplete="off"
                />
                <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={disabled || !message.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
                >
                    <Send className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
