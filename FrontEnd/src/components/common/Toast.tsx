import { useEffect, useState } from 'react';

interface ToastProps {
    message: string;
    type: 'error' | 'success';
    duration?: number;
    onClose?: () => void;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const Toast = ({
    message,
    type,
    duration = 2000,
    onClose,
    action,
}: ToastProps) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (duration <= 0) return;

        const timer = setTimeout(() => {
            setIsVisible(false);
            onClose?.();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgColor = type === 'error' ? 'bg-red-600' : 'bg-green-600';
    const icon = type === 'error' ? 'error' : 'check_circle';

    return (
        <>
            {isVisible && (
                <div
                    className={`fixed bottom-24 right-6 flex items-center gap-3 rounded-lg ${bgColor} px-4 py-3 text-white shadow-lg animate-in slide-in-from-right-4 duration-300`}
                >
                    <span className="material-symbols-outlined shrink-0 text-xl">
                        {icon}
                    </span>
                    <div className="flex-1 text-sm font-medium">{message}</div>
                    {action ? (
                        <button
                            onClick={() => {
                                action.onClick();
                                setIsVisible(false);
                                onClose?.();
                            }}
                            className="ml-2 whitespace-nowrap text-xs font-bold hover:underline"
                        >
                            {action.label}
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setIsVisible(false);
                                onClose?.();
                            }}
                            className="shrink-0 hover:opacity-80"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    )}
                </div>
            )}
        </>
    );
};

export default Toast;
