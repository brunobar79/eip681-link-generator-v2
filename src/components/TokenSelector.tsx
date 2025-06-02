import { useState, Fragment, useEffect, useCallback } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { Token } from '../types';
import { searchTokensOnDexScreener } from '../utils/tokenSearch';
import { CHAINS } from '../data/chains';
import clsx from 'clsx';

interface TokenSelectorProps {
  selectedToken: Token | null;
  onTokenChange: (token: Token | null) => void;
  chainId?: number;
  error?: string;
  placeholder?: string;
  showLabel?: boolean;
}

export default function TokenSelector({ 
  selectedToken, 
  onTokenChange, 
  chainId, 
  error,
  placeholder = "Search for any token...",
  showLabel = true
}: TokenSelectorProps) {
  const [query, setQuery] = useState('');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Get the current chain data
  const currentChain = chainId ? CHAINS.find(chain => chain.chainId === chainId) : null;

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, currentChainId: number) => {
      if (!searchQuery || searchQuery.length < 2 || !currentChainId) {
        setTokens([]);
        setIsSearching(false);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);
      try {
        const results = await searchTokensOnDexScreener(searchQuery, currentChainId);
        setTokens(results);
      } catch (error) {
        console.error('Error searching tokens:', error);
        setTokens([]);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    []
  );

  // Effect for debounced search
  useEffect(() => {
    if (chainId) {
      debouncedSearch(query, chainId);
    }
  }, [query, chainId, debouncedSearch]);

  // Clear results when chain changes
  useEffect(() => {
    setTokens([]);
    setQuery('');
    setHasSearched(false);
  }, [chainId]);

  return (
    <div className="relative">
      {showLabel && (
        <label className="label">
          Token (Optional)
        </label>
      )}
      <Combobox value={selectedToken} onChange={onTokenChange}>
        <div className="relative">
          <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-sm border border-gray-300 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
            <Combobox.Input
              className={clsx(
                'w-full border-none py-3 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 focus:outline-none',
                error && 'text-red-900',
                !chainId && 'bg-gray-100 cursor-not-allowed'
              )}
              displayValue={(token: Token | null) => {
                if (token) {
                  return `${token.symbol} - ${token.name}`;
                } else if (currentChain) {
                  // Show native currency when no token is selected
                  return `${currentChain.nativeCurrency.symbol} - ${currentChain.nativeCurrency.name}`;
                }
                return '';
              }}
              onChange={(event) => chainId ? setQuery(event.target.value) : null}
              onFocus={(event) => event.target.select()}
              placeholder={chainId ? placeholder : "Select a network first..."}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              {isSearching ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
              ) : (
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              )}
            </Combobox.Button>
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
              {/* Native currency option */}
              <Combobox.Option
                className={({ active }) =>
                  clsx(
                    'relative cursor-default select-none py-2 pl-10 pr-4',
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  )
                }
                value={null}
              >
                {({ selected, active }) => (
                  <>
                    <span className={clsx('block truncate', selected ? 'font-medium' : 'font-normal')}>
                      {currentChain ? `${currentChain.nativeCurrency.symbol} - ${currentChain.nativeCurrency.name}` : 'Native Currency'}
                    </span>
                    {selected ? (
                      <span
                        className={clsx(
                          'absolute inset-y-0 left-0 flex items-center pl-3',
                          active ? 'text-gray-600' : 'text-gray-500'
                        )}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Combobox.Option>

              {/* Search results */}
              {tokens.length > 0 && (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                    Search Results
                  </div>
                  {tokens.map((token) => (
                    <TokenOption key={`${token.address}-${token.chainId}`} token={token} />
                  ))}
                </>
              )}

              {/* No results message */}
              {tokens.length === 0 && hasSearched && !isSearching && query.length >= 2 && (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  No tokens found. Try a different search term.
                </div>
              )}

              {/* Search prompt */}
              {!hasSearched && query.length < 2 && chainId && (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-500">
                  Type at least 2 characters to search for tokens...
                </div>
              )}

              {/* Loading message */}
              {isSearching && query.length >= 2 && (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                    Searching for tokens...
                  </div>
                </div>
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
      {error && <p className="error-text">{error}</p>}
      {!chainId && (
        <p className="text-sm text-gray-500 mt-1">
          Please select a network first to search for tokens.
        </p>
      )}
      {chainId && (
        <p className="text-sm text-gray-500 mt-1">
          Type to search for any token on this network.
        </p>
      )}
    </div>
  );
}

// Token option component
function TokenOption({ token }: { token: Token }) {
  return (
    <Combobox.Option
      className={({ active }) =>
        clsx(
          'relative cursor-default select-none py-2 pl-10 pr-4',
          active ? 'bg-primary-600 text-white' : 'text-gray-900'
        )
      }
      value={token}
    >
      {({ selected, active }) => (
        <>
          <div className="flex items-center">
            {token.logoURI && (
              <img
                src={token.logoURI}
                alt={token.symbol}
                className="h-5 w-5 rounded-full mr-3 flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="min-w-0 flex-1">
              <span
                className={clsx(
                  'block truncate',
                  selected ? 'font-medium' : 'font-normal'
                )}
              >
                {token.symbol} - {token.name}
              </span>
              <span
                className={clsx(
                  'text-xs truncate block',
                  active ? 'text-primary-200' : 'text-gray-500'
                )}
              >
                {token.address}
              </span>
            </div>
          </div>
          {selected ? (
            <span
              className={clsx(
                'absolute inset-y-0 left-0 flex items-center pl-3',
                active ? 'text-white' : 'text-primary-600'
              )}
            >
              <CheckIcon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
        </>
      )}
    </Combobox.Option>
  );
}

// Utility functions
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
} 