import { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircleIcon, 
  MagnifyingGlassIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ClipboardIcon
} from '@heroicons/react/24/outline';
import { processAddressInput, ENSResult, chainSupportsNaming, isNameSupportedOnChain } from '../utils/ens';
import clsx from 'clsx';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  chainId?: number;
  placeholder?: string;
  error?: string;
  label?: string;
  required?: boolean;
  id?: string;
}

export default function AddressInput({
  value,
  onChange,
  chainId = 1,
  placeholder = "Enter wallet address or ENS name",
  error,
  label = "Address",
  required = false,
  id = "address-input"
}: AddressInputProps) {
  const [ensResult, setEnsResult] = useState<ENSResult | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const resolveAddress = useCallback(async (input: string) => {
    if (!input.trim()) {
      setEnsResult(null);
      return;
    }

    // Check if the chain supports naming services
    if (!chainSupportsNaming(chainId)) {
      setEnsResult(null);
      return;
    }

    // If it's a name but not supported on this chain, show a helpful message
    if (input.includes('.') && !isNameSupportedOnChain(input, chainId)) {
      const wrongChainResult: ENSResult = {
        address: '',
        ensName: input,
        avatar: null,
        isValid: false,
        isENS: true,
      };
      setEnsResult(wrongChainResult);
      return;
    }

    setIsResolving(true);
    try {
      const result = await processAddressInput(input, chainId);
      setEnsResult(result);
    } catch (error) {
      console.error('Address resolution error:', error);
      setEnsResult(null);
    } finally {
      setIsResolving(false);
    }
  }, [chainId]); // Only depend on chainId

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (value) {
        resolveAddress(value);
      } else {
        setEnsResult(null);
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(debounceTimer);
  }, [value, resolveAddress]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all text when input is focused
    e.target.select();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        onChange(text.trim());
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
      // Fallback: focus the input so user can manually paste with Ctrl+V
      const input = document.activeElement as HTMLInputElement;
      if (input && input.tagName === 'INPUT') {
        input.focus();
      }
    }
  };

  const shouldShowResolution = ensResult && ensResult.isValid && (ensResult.isENS || ensResult.ensName);
  const hasError = ensResult && ensResult.isENS && !ensResult.isValid;
  
  // Check if it's a name that's not supported on this chain
  const isWrongChain = hasError && ensResult.ensName.includes('.');
  const isBasenameOnWrongChain = isWrongChain && ensResult.ensName.toLowerCase().endsWith('.base.eth') && chainId !== 8453;
  const isENSOnWrongChain = isWrongChain && !ensResult.ensName.toLowerCase().endsWith('.base.eth') && chainId !== 1;

  return (
    <div className="space-y-2">
      {label && (
        <label className="label" htmlFor={id}>
          {label} {required && '*'}
        </label>
      )}
      
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className={clsx(
            'input-field transition-all duration-200',
            shouldShowResolution && 'pr-40', // More space for resolution + paste button
            !shouldShowResolution && 'pr-16', // Space for paste button + status icon
            error && 'input-error',
            shouldShowResolution && 'border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50/30',
            hasError && 'border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/30'
          )}
          placeholder={placeholder}
        />
        
        {/* Resolution overlay */}
        {shouldShowResolution && (
          <div className="absolute inset-y-0 right-10 flex items-center pr-3">
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-md px-2 py-1 border border-green-200">
              {ensResult.avatar && (
                <img
                  src={ensResult.avatar}
                  alt="ENS Avatar"
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <span className="text-xs font-mono text-green-700">
                {ensResult.isENS 
                  ? `${ensResult.address.slice(0, 6)}...${ensResult.address.slice(-4)}`
                  : ensResult.ensName
                }
              </span>
              <CheckCircleIcon className="h-3 w-3 text-green-500" />
            </div>
          </div>
        )}
        
        {/* Paste button with tooltip */}
        <div className="absolute inset-y-0 right-0 flex items-center">
          <div className="relative">
            <button
              type="button"
              onClick={handlePaste}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="h-full px-3 text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none focus:text-gray-600"
            >
              <ClipboardIcon className="h-4 w-4" />
            </button>
            
            {/* Custom tooltip */}
            {showTooltip && (
              <div className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap z-50 animate-in fade-in slide-in-from-bottom-1 duration-200">
                Click to paste
                <div className="absolute top-full right-2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            )}
          </div>
        </div>
        
        {/* Status indicator */}
        {!shouldShowResolution && (
          <div className="absolute inset-y-0 right-10 flex items-center pr-3">
            {isResolving ? (
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 animate-pulse" />
            ) : hasError ? (
              <ExclamationCircleIcon className="h-5 w-5 text-amber-500" />
            ) : !chainSupportsNaming(chainId) && value.includes('.') ? (
              <InformationCircleIcon className="h-5 w-5 text-blue-500" />
            ) : null}
          </div>
        )}
      </div>

      {/* Error state for ENS */}
      {isBasenameOnWrongChain && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
          <ExclamationCircleIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <div className="text-sm text-amber-700">
            Basenames (.base.eth) only work on Base network. Switch to Base to resolve "{ensResult.ensName}".
          </div>
        </div>
      )}

      {isENSOnWrongChain && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
          <ExclamationCircleIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <div className="text-sm text-amber-700">
            ENS names only work on Ethereum Mainnet. Switch to Mainnet to resolve "{ensResult.ensName}".
          </div>
        </div>
      )}

      {!chainSupportsNaming(chainId) && value.includes('.') && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-blue-200">
          <InformationCircleIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            This network doesn't support naming services. Only wallet addresses are supported.
          </div>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
} 