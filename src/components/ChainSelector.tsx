import { useState, Fragment, useEffect } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { ExtendedChain, CHAINS, getChainIcon, getChainsAsync } from '../data/chains';
import clsx from 'clsx';

interface ChainSelectorProps {
  selectedChain: ExtendedChain | null;
  onChainChange: (chain: ExtendedChain) => void;
  error?: string;
}

export default function ChainSelector({ selectedChain, onChainChange, error }: ChainSelectorProps) {
  const [query, setQuery] = useState('');
  const [chains, setChains] = useState<ExtendedChain[]>(CHAINS);

  // Load chains dynamically
  useEffect(() => {
    getChainsAsync().then(setChains).catch(console.error);
  }, []);

  const filteredChains =
    query === ''
      ? chains
      : chains.filter((chain) =>
          chain.name
            .toLowerCase()
            .replace(/\s+/g, '')
            .includes(query.toLowerCase().replace(/\s+/g, '')) ||
          chain.shortName
            .toLowerCase()
            .includes(query.toLowerCase()) ||
          chain.nativeCurrency.symbol
            .toLowerCase()
            .includes(query.toLowerCase())
        );

  const handleChainChange = (chain: ExtendedChain) => {
    onChainChange(chain);
    setQuery('');
  };

  return (
    <div className="relative">
      <label className="label">
        Chain
      </label>
      <Combobox value={selectedChain} onChange={handleChainChange}>
        {({ open }) => (
          <div className="relative">
            <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-sm border border-gray-300 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
              {/* Clickable area that opens dropdown */}
              {!open && (
                <div className="flex items-center py-2 pl-3 pr-10 cursor-pointer">
                  {selectedChain ? (
                    <>
                      <img
                        src={getChainIcon(selectedChain)}
                        alt={selectedChain.name}
                        className="h-5 w-5 rounded-full mr-3 flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.src = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png';
                        }}
                      />
                      <span className="block truncate text-sm text-gray-900">
                        {selectedChain.name}
                      </span>
                    </>
                  ) : (
                    <span className="block text-sm text-gray-500">Select a network...</span>
                  )}
                </div>
              )}
              
              {/* Search input - only visible when open */}
              <Combobox.Input
                className={clsx(
                  'w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 focus:outline-none bg-white',
                  !open && 'absolute inset-0 opacity-0 cursor-pointer',
                  open && 'relative opacity-100',
                  error && 'text-red-900'
                )}
                displayValue={() => open ? query : ''}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={open ? 'Search networks...' : ''}
              />
              
              <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
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
                {filteredChains.length === 0 && query !== '' ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                    Nothing found.
                  </div>
                ) : (
                  filteredChains.map((chain) => (
                    <Combobox.Option
                      key={chain.chainId}
                      className={({ active }) =>
                        clsx(
                          'relative cursor-default select-none py-2 pl-10 pr-4',
                          active ? 'bg-primary-600 text-white' : 'text-gray-900'
                        )
                      }
                      value={chain}
                    >
                      {({ selected, active }) => (
                        <>
                          <div className="flex items-center">
                            <img
                              src={getChainIcon(chain)}
                              alt={chain.name}
                              className="h-5 w-5 rounded-full mr-3"
                              onError={(e) => {
                                e.currentTarget.src = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png';
                              }}
                            />
                            <div>
                              <span
                                className={clsx(
                                  'block truncate',
                                  selected ? 'font-medium' : 'font-normal'
                                )}
                              >
                                {chain.name}
                              </span>
                              <span
                                className={clsx(
                                  'text-xs',
                                  active ? 'text-primary-200' : 'text-gray-500'
                                )}
                              >
                                Chain ID: {chain.chainId} • {chain.nativeCurrency.symbol}
                                {chain.faucets.length > 0 && ' • Testnet'}
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
                  ))
                )}
              </Combobox.Options>
            </Transition>
          </div>
        )}
      </Combobox>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
} 