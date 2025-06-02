import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ClipboardDocumentIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import ChainSelector from './ChainSelector';
import TokenSelector from './TokenSelector';
import AddressInput from './AddressInput';
import QRCodeGenerator from './QRCodeGenerator';
import { Token, TransactionFormData } from '../types';
import { ExtendedChain, CHAINS } from '../data/chains';
import { formDataToEIP681URL } from '../utils/eip681';
import { processAddressInput } from '../utils/ens';
import clsx from 'clsx';

// Utility functions for decimal conversion
function parseUnits(value: string, decimals: number): string {
  if (!value || value === '0') return '0';
  
  const numericValue = parseFloat(value);
  if (isNaN(numericValue) || numericValue === 0) return '0';
  
  // Convert to the token's base unit (multiply by 10^decimals)
  const baseValue = numericValue * Math.pow(10, decimals);
  
  // Convert to scientific notation if it would be shorter
  const fullString = baseValue.toString();
  
  // Check if we can use a cleaner scientific notation
  if (baseValue >= 1000 && Number.isInteger(baseValue)) {
    // Find the highest power of 10 that divides evenly into the number
    let coefficient = baseValue;
    let exponent = 0;
    
    while (coefficient >= 10 && coefficient % 10 === 0) {
      coefficient /= 10;
      exponent++;
    }
    
    if (exponent > 0) {
      // Use scientific notation if it's shorter or cleaner
      const scientificForm = coefficient === 1 ? `1e${exponent}` : `${coefficient}e${exponent}`;
      if (scientificForm.length < fullString.length) {
        return scientificForm;
      }
    }
  }
  
  // For non-integer results or when scientific notation isn't shorter, use the full number
  return Math.round(baseValue).toString();
}

export default function TransactionForm() {
  const [selectedChain, setSelectedChain] = useState<ExtendedChain | null>(CHAINS[0] || null); // Default to first chain
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [generatedURL, setGeneratedURL] = useState<string>('');
  const [userFriendlyTitle, setUserFriendlyTitle] = useState<string>('');
  const [resolvedEnsResult, setResolvedEnsResult] = useState<any>(null);
  const [showAmountTooltip, setShowAmountTooltip] = useState(false);
  const [includeAvatar, setIncludeAvatar] = useState(false);
  const qrCodeSectionRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<TransactionFormData>({
    defaultValues: {
      chainId: 1,
      toAddress: '',
      value: '',
      tokenAmount: '',
    }
  });

  const watchedValues = watch();

  // Update chain ID when chain changes
  useEffect(() => {
    if (selectedChain) {
      setValue('chainId', selectedChain.chainId);
    }
  }, [selectedChain, setValue]);

  // Clear token when chain changes
  useEffect(() => {
    setSelectedToken(null);
  }, [selectedChain]);

  const onSubmit = async (data: TransactionFormData) => {
    if (!selectedChain) return;

    try {
      // Validate and resolve address
      let resolvedAddress = data.toAddress;
      let ensResult = null;
      
      if (!data.toAddress || !data.toAddress.trim()) {
        toast.error('Please enter a valid address');
        return;
      }
      
      // Process the address input (validates both regular addresses and ENS names)
      ensResult = await processAddressInput(data.toAddress, selectedChain.chainId);
      
      if (!ensResult.isValid) {
        if (ensResult.isENS) {
          toast.error('Could not resolve ENS name');
        } else {
          toast.error('Please enter a valid address');
        }
        return;
      }
      
      resolvedAddress = ensResult.address || data.toAddress;
      if (ensResult.isENS && ensResult.address) {
        setResolvedEnsResult(ensResult);
      }

      // Convert amount to proper decimal notation
      let convertedValue = data.value;
      if (data.value && data.value !== '0') {
        const decimals = selectedToken ? selectedToken.decimals : selectedChain.nativeCurrency.decimals;
        convertedValue = parseUnits(data.value, decimals);
      }

      // Prepare form data with resolved address and converted amount
      const formData: TransactionFormData = {
        ...data,
        toAddress: resolvedAddress,
        value: convertedValue,
        tokenAddress: selectedToken?.address,
      };

      const url = formDataToEIP681URL(formData);
      setGeneratedURL(url);

      // Generate user-friendly title
      const symbol = selectedToken ? selectedToken.symbol : selectedChain.nativeCurrency.symbol;
      const network = selectedChain.name;
      const recipient = ensResult?.ensName || data.toAddress;
      
      // Don't show amount if it's empty, 0, or not a positive number
      const amount = data.value?.trim();
      const shouldShowAmount = amount && amount !== '0' && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;
      const titleText = shouldShowAmount 
        ? `Send ${amount} ${symbol} on ${network} to ${recipient}`
        : `Send ${symbol} on ${network} to ${recipient}`;
      
      setUserFriendlyTitle(titleText);
      
      toast.success('Payment link generated successfully!');

      // Auto-scroll to QR code section
      setTimeout(() => {
        qrCodeSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    } catch (error) {
      console.error('Error generating URL:', error);
      toast.error('Failed to generate payment link');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedURL);
      toast.success('URL copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  const resetForm = () => {
    reset();
    setSelectedChain(CHAINS[0] || null);
    setSelectedToken(null);
    setGeneratedURL('');
    setUserFriendlyTitle('');
    setResolvedEnsResult(null);
  };

  const printQRCode = () => {
    if (!generatedURL || !qrCodeSectionRef.current) return;

    // Get the QR code canvas element
    const canvas = qrCodeSectionRef.current.querySelector('canvas');
    if (!canvas) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return;

    // Get the canvas data URL
    const qrCodeDataURL = canvas.toDataURL('image/png');

    // Create the print content
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${userFriendlyTitle}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              background: white;
            }
            .title {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 20px;
              text-align: center;
              max-width: 500px;
              line-height: 1.3;
            }
            .qr-code {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 15px;
              background: white;
            }
            @media print {
              body {
                margin: 0;
                padding: 15px;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              }
              .title {
                font-size: 16px;
                margin-bottom: 15px;
              }
              .qr-code {
                padding: 10px;
                border: 1px solid #ccc;
              }
            }
          </style>
        </head>
        <body>
          <div class="title">${userFriendlyTitle}</div>
          <div class="qr-code">
            <img src="${qrCodeDataURL}" alt="QR Code" style="display: block; max-width: 100%; height: auto;" />
          </div>
        </body>
      </html>
    `;

    // Write content and trigger print
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for the image to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Chain Selection */}
        <div>
          <ChainSelector
            selectedChain={selectedChain}
            onChainChange={setSelectedChain}
            error={errors.chainId?.message}
          />
        </div>

        {/* To Address */}
        <div>
          <AddressInput
            id="toAddress"
            value={watch('toAddress')}
            onChange={(value) => setValue('toAddress', value)}
            chainId={selectedChain?.chainId}
            label="To Address"
            error={errors.toAddress?.message}
            required
          />
        </div>

        {/* Token Selection and Amount */}
        <div className="flex gap-3">
          {/* Token Selection */}
          <div className="flex-1">
            <TokenSelector
              selectedToken={selectedToken}
              onTokenChange={setSelectedToken}
              chainId={selectedChain?.chainId}
              error={errors.tokenAddress?.message}
              showLabel={true}
            />
          </div>
          
          {/* Amount Input */}
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-1">
              <label htmlFor="value" className="label mb-0">Amount (Optional)</label>
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowAmountTooltip(true)}
                  onMouseLeave={() => setShowAmountTooltip(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none translate-y-[3px]"
                >
                  <InformationCircleIcon className="h-4 w-4" />
                </button>
                
                {/* Amount tooltip */}
                {showAmountTooltip && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap z-50 animate-in fade-in slide-in-from-bottom-1 duration-200 max-w-xs">
                    Enter the actual amount (To send 5.3 ETH enter 5.3)
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </div>
            </div>
            <input
              id="value"
              type="number"
              step="any"
              {...register('value', {
                validate: (value) => {
                  if (value && parseFloat(value) <= 0) {
                    return 'Amount must be greater than 0 if provided';
                  }
                  return true;
                }
              })}
              onFocus={(event) => event.target.select()}
              placeholder="0.00"
              className={clsx('input-field', errors.value && 'input-error')}
            />
            {errors.value && <p className="error-text">{errors.value.message}</p>}
          </div>
        </div>
        
        {/* Token error message */}
        {errors.tokenAddress && <p className="error-text">{errors.tokenAddress.message}</p>}
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={!watchedValues.toAddress}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Payment Link
          </button>
          
          <button
            type="button"
            onClick={resetForm}
            className="btn-secondary"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Generated URL Display */}
      {generatedURL && (
        <div ref={qrCodeSectionRef} className="mt-12 card">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            {userFriendlyTitle}
          </h3>
          
          {/* Avatar inclusion checkbox */}
          {resolvedEnsResult?.avatar && (
            <div className="flex items-center justify-center mb-4">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={includeAvatar}
                  onChange={(e) => setIncludeAvatar(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Include avatar in QR code
              </label>
            </div>
          )}
          
          <QRCodeGenerator 
            value={generatedURL}
            avatar={includeAvatar ? resolvedEnsResult?.avatar : undefined}
            size={256}
          />

          {/* Payment Link Input */}
          <div className="mt-6">
            <label className="label text-center">Payment Link</label>
            <input
              type="text"
              value={generatedURL}
              readOnly
              onFocus={(event) => event.target.select()}
              className="input-field w-full font-mono text-sm bg-gray-50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-3 mt-6">
            <button
              onClick={copyToClipboard}
              className="btn-primary flex items-center gap-2"
              type="button"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
              Copy Url
            </button>
            <button
              onClick={printQRCode}
              className="btn-secondary flex items-center gap-2"
              type="button"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a1 1 0 001-1v-4a1 1 0 00-1-1H9a1 1 0 00-1 1v4a1 1 0 001 1zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 