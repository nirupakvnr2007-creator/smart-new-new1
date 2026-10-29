import React, { useState, useMemo } from 'react';
import { CustomerReview, ProductItem, SalesTransaction, ShopProfile } from '../../types';
import { QRCodeSVG } from '../../utils/qrGenerator';
import { apiVerifyPurchase, apiSaveReview } from '../../services/api';
import { COUNTRY_CODES, validatePhoneNumber } from '../../utils/validation';
import { classifyReview, analyzeReviewBatch, getTrainingDataset } from '../../ml/sentimentModel';

interface PublicCustomerFeedbackScreenProps {
  productId: string;
  products: ProductItem[];
  shop: ShopProfile | null;
  transactions: SalesTransaction[];
  reviews: CustomerReview[];
  onAddReview: (review: CustomerReview) => void;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const PublicCustomerFeedbackScreen: React.FC<PublicCustomerFeedbackScreenProps> = ({
  productId,
  products,
  shop,
  transactions,
  reviews,
  onAddReview,
  onClose,
  onShowToast
}) => {
  const product = products.find((p) => p.id === productId);

  // Verification state with country code
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    receiptNumber?: string;
    timestamp?: string;
    errorMsg?: string;
  } | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Freshness', 'Quality']);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // ML Dataset & Filter state
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'Positive' | 'Negative' | 'Neutral'>('all');
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [datasetSearch, setDatasetSearch] = useState('');

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-3 border border-[#dae2fd]">
          <span className="material-symbols-outlined text-[48px] text-[#ba1a1a]">
            error_outline
          </span>
          <h2 className="font-headline font-bold text-[18px] text-[#0b1c30]">
            Product Not Found
          </h2>
          <p className="text-[13px] text-[#565e74]">
            The product QR feedback code does not match any registered product in the store database.
          </p>
          <button
            onClick={onClose}
            className="mt-3 px-4 py-2 bg-[#0037b0] text-white rounded-lg text-[13px] font-bold cursor-pointer"
          >
            Return to Store
          </button>
        </div>
      </div>
    );
  }

  const productReviews = reviews.filter((r) => r.productId === product.id);

  // Run ML sentiment analysis on all product reviews
  const sentimentSummary = useMemo(() => {
    return analyzeReviewBatch(productReviews);
  }, [productReviews]);

  // Enrich product reviews with ML sentiment if missing
  const enrichedReviews = useMemo(() => {
    return productReviews.map((r) => {
      if (r.sentiment && r.sentimentConfidence) return r;
      const ml = classifyReview(r.comment, r.rating);
      return {
        ...r,
        sentiment: ml.sentiment,
        sentimentScore: ml.score,
        sentimentConfidence: ml.confidence,
        sentimentKeywords: ml.keywords
      };
    });
  }, [productReviews]);

  // Filtered reviews based on active tab
  const filteredReviews = useMemo(() => {
    if (sentimentFilter === 'all') return enrichedReviews;
    return enrichedReviews.filter((r) => r.sentiment === sentimentFilter);
  }, [enrichedReviews, sentimentFilter]);

  const avgRating =
    productReviews.length > 0
      ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
      : '5.0';

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Verify buyer phone number against transactions in DB
  const handleVerifyPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setVerificationResult(null);

    // Validate phone number format
    const phoneValidation = validatePhoneNumber(countryCode, phoneInput);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.message || 'Invalid mobile number format.');
      return;
    }

    const cleanInput = phoneInput.replace(/\D/g, '');
    const fullPhoneNumber = `${countryCode} ${cleanInput}`;

    setIsVerifying(true);

    try {
      // 1. Try server verification endpoint first
      const serverResult = await apiVerifyPurchase(product.id, cleanInput, product.shopId || shop?.id);
      if (serverResult.verified) {
        setVerificationResult({
          verified: true,
          receiptNumber: serverResult.receiptNumber || 'Verified In-Store',
          timestamp: serverResult.timestamp || 'Recent Purchase'
        });
        setVerifiedPhone(fullPhoneNumber);
        onShowToast('Purchase verified! You can now submit your rating and feedback.');
        setIsVerifying(false);
        return;
      }
    } catch {
      // Fallback to local transactions verification
    }

    // 2. Local database transactions check
    const matchedTxn = transactions.find((txn) => {
      const cleanTxnPhone = (txn.customerPhone || '').replace(/\D/g, '');
      const phoneMatches =
        cleanTxnPhone.length >= 6 &&
        (cleanTxnPhone.includes(cleanInput) || cleanInput.includes(cleanTxnPhone));
      const hasProduct = txn.items?.some(
        (item) => item.productId === product.id || item.sku === product.sku
      );
      return phoneMatches && hasProduct;
    });

    setIsVerifying(false);

    if (matchedTxn) {
      setVerificationResult({
        verified: true,
        receiptNumber: matchedTxn.receiptNumber,
        timestamp: matchedTxn.timestamp
      });
      setVerifiedPhone(fullPhoneNumber);
      onShowToast('Purchase verified! Feedback form unlocked.');
    } else {
      setVerificationResult({
        verified: false,
        errorMsg: `Verification failed: Mobile number "${countryCode} ${phoneInput}" has no recorded purchase for "${product.name}". Only customers who purchased this item can leave a review.`
      });
    }
  };

  // Submit verified review with ML classification
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedPhone) {
      onShowToast('Mobile verification required before posting review.');
      return;
    }

    if (!comment.trim()) {
      onShowToast('Please enter your review feedback.');
      return;
    }

    // Run ML Model to classify review in real-time
    const mlAnalysis = classifyReview(comment.trim(), rating);

    const newReview: CustomerReview = {
      id: `rev-${Date.now()}`,
      shopId: product.shopId || shop?.id,
      productId: product.id,
      productName: product.name,
      customerPhone: verifiedPhone,
      countryCode,
      rating,
      comment: comment.trim(),
      tags: selectedTags,
      sentiment: mlAnalysis.sentiment,
      sentimentScore: mlAnalysis.score,
      sentimentConfidence: mlAnalysis.confidence,
      sentimentKeywords: mlAnalysis.keywords,
      timestamp: new Date().toLocaleDateString([], {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      isVerified: true
    };

    onAddReview(newReview);
    await apiSaveReview(newReview);
    setIsSubmitted(true);
    onShowToast(`Verified feedback posted! ML classified as: ${mlAnalysis.sentiment} (${Math.round(mlAnalysis.confidence * 100)}% confidence).`);
  };

  // Download Training Dataset JSON handler
  const handleDownloadDataset = () => {
    const dataset = getTrainingDataset();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataset, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'retail_sentiment_training_dataset.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast('Downloaded 70+ retail sentiment training dataset (JSON).');
  };

  const qrUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?feedback=${product.id}`
      : product.qrCode;

  const datasetList = getTrainingDataset();
  const filteredDataset = datasetList.filter(
    (item) =>
      item.text.toLowerCase().includes(datasetSearch.toLowerCase()) ||
      item.label.toLowerCase().includes(datasetSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(datasetSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-sans antialiased pb-12 selection:bg-[#dce1ff] selection:text-[#001551]">
      {/* Top Header */}
      <header className="bg-white border-b border-[#e5eeff] sticky top-0 z-40 px-4 py-3 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0037b0] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
            <div>
              <span className="font-headline font-bold text-[14px] text-[#0b1c30] block">
                {shop?.name || 'Smart Retail Store'}
              </span>
              <span className="text-[10px] text-[#565e74]">
                Verified Product Packaging Feedback &amp; ML Sentiment Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDatasetModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#dce1ff] text-[#0037b0] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Inspect Training Dataset"
            >
              <span className="material-symbols-outlined text-[15px]">database</span>
              <span className="hidden sm:inline">ML Dataset</span>
            </button>

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-[#0037b0] hover:bg-[#1d4ed8] text-white text-[12px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">store</span>
              <span>Back to Store</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto w-full p-4 space-y-4 flex-grow">
        {/* Product Identity Card */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#e5eeff] flex flex-col sm:flex-row items-center gap-4">
          <div className="p-2 bg-[#f8f9ff] border border-[#dae2fd] rounded-xl shrink-0">
            <QRCodeSVG value={qrUrl} size={110} />
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="font-mono text-[10px] font-bold bg-[#dce1ff] text-[#0039b5] px-2 py-0.5 rounded">
                {product.sku}
              </span>
              <span className="text-[10px] font-bold bg-[#85f8c4] text-[#002114] px-2 py-0.5 rounded">
                Verified Packaging QR
              </span>
              <span className="text-[10px] font-bold bg-[#eff4ff] text-[#0037b0] px-2 py-0.5 rounded flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">psychology</span>
                ML Sentiment Active
              </span>
            </div>
            <h1 className="font-headline font-bold text-[20px] text-[#0b1c30]">{product.name}</h1>
            <p className="text-[12px] text-[#565e74]">
              Brand: <strong>{product.brand}</strong> • Category: {product.category}
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
              <span className="font-headline font-bold text-[18px] text-[#0037b0]">
                ₹{product.price}
              </span>
              <div className="flex items-center gap-1 text-[12px] font-bold text-[#0b1c30]">
                <span className="material-symbols-outlined text-[#ffab00] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
                <span>{avgRating} ({productReviews.length} verified reviews)</span>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 1: MOBILE BUYER VERIFICATION GATE */}
        {!verifiedPhone ? (
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#dae2fd] space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#eff4ff]">
              <span className="material-symbols-outlined text-[#0037b0] text-[22px]">
                phonelink_lock
              </span>
              <div>
                <h2 className="font-headline font-bold text-[16px] text-[#0b1c30]">
                  Step 1: Mobile Buyer Verification
                </h2>
                <p className="text-[11px] text-[#565e74]">
                  Select your country code and enter the customer mobile number given at checkout to verify your purchase.
                </p>
              </div>
            </div>

            <form onSubmit={handleVerifyPurchase} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-[#0b1c30]">
                  Purchased Customer Mobile Number *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Country Code Dropdown */}
                  <div className="w-full sm:w-48 bg-[#eff4ff] border border-[#dae2fd] rounded-xl px-2.5 py-2 flex items-center focus-within:bg-white focus-within:border-[#0037b0]">
                    <select
                      value={countryCode}
                      onChange={(e) => {
                        setCountryCode(e.target.value);
                        setPhoneError(null);
                      }}
                      className="w-full bg-transparent text-[13px] text-[#0b1c30] font-medium outline-none cursor-pointer"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code} ({c.country})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Phone digits input */}
                  <div className="flex-1 flex items-center gap-2 bg-[#eff4ff] border border-[#dae2fd] rounded-xl px-3 py-2 focus-within:bg-white focus-within:border-[#0037b0] focus-within:ring-2 focus-within:ring-[#0037b0]/20">
                    <span className="material-symbols-outlined text-[#565e74] text-[18px]">
                      call
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9840123456"
                      value={phoneInput}
                      onChange={(e) => {
                        setPhoneInput(e.target.value);
                        setPhoneError(null);
                      }}
                      className="w-full bg-transparent text-[14px] text-[#0b1c30] outline-none"
                    />
                  </div>

                  {/* Verify button */}
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="px-5 py-2.5 bg-[#0037b0] hover:bg-[#1d4ed8] disabled:opacity-50 text-white rounded-xl text-[13px] font-bold cursor-pointer transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5"
                  >
                    {isVerifying ? (
                      <span>Verifying...</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        <span>Verify Buyer</span>
                      </>
                    )}
                  </button>
                </div>

                {phoneError && (
                  <p className="text-[11px] text-[#ba1a1a] font-medium pt-0.5">{phoneError}</p>
                )}
              </div>

              {verificationResult && !verificationResult.verified && (
                <div className="p-3 bg-[#ffdad6] border border-[#ffb4ab] rounded-xl text-[12px] text-[#93000a] flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
                    gpp_bad
                  </span>
                  <div>
                    <span className="font-bold block">Access Restricted</span>
                    <span>{verificationResult.errorMsg}</span>
                  </div>
                </div>
              )}

              <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#dae2fd] text-[11px] text-[#565e74] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#0b1c30]">
                  <span className="material-symbols-outlined text-[#0037b0] text-[15px]">info</span>
                  <span>Why is mobile validation required?</span>
                </div>
                <p>
                  To protect store integrity and prevent fake reviews, only customers who purchased this item at the store counter can post ratings. Your number is matched with offline MongoDB transaction records.
                </p>
              </div>
            </form>
          </div>
        ) : (
          /* STEP 2: VERIFIED BUYER FEEDBACK FORM */
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#dae2fd] space-y-4">
            {/* Verification Success Badge */}
            <div className="p-3 bg-[#85f8c4]/20 border border-[#85f8c4] rounded-xl flex items-center justify-between gap-3 text-[#002114]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#004f35] text-[20px]">
                  verified
                </span>
                <div>
                  <span className="text-[13px] font-bold block">
                    Verified Buyer: {verifiedPhone}
                  </span>
                  <span className="text-[11px] text-[#565e74]">
                    Invoice #{verificationResult?.receiptNumber || 'Purchased'} • Authenticated Customer
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setVerifiedPhone(null);
                  setVerificationResult(null);
                }}
                className="text-[11px] text-[#ba1a1a] font-bold hover:underline cursor-pointer"
              >
                Change Phone
              </button>
            </div>

            {isSubmitted ? (
              <div className="text-center py-8 space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#85f8c4] text-[#002114] flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[28px]">check</span>
                </div>
                <h3 className="font-headline font-bold text-[17px] text-[#0b1c30]">
                  Feedback Submitted &amp; ML Analyzed!
                </h3>
                <p className="text-[12px] text-[#565e74] max-w-sm mx-auto">
                  Thank you for rating {product.name}. Your feedback has been scored by our offline sentiment engine and stored in the database.
                </p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="mt-3 px-4 py-2 bg-[#eff4ff] text-[#0037b0] rounded-lg text-[12px] font-bold cursor-pointer"
                >
                  Write Another Note
                </button>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-[#0b1c30]">
                    Your Rating (1 to 5 Stars) *
                  </label>
                  <div className="flex items-center gap-1 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="cursor-pointer text-[#ffab00] hover:scale-110 transition-transform p-1"
                      >
                        <span
                          className="material-symbols-outlined text-[32px]"
                          style={{ fontVariationSettings: star <= rating ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                    <span className="text-[14px] font-bold text-[#0b1c30] ml-3">
                      {rating} / 5 Stars
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-[#0b1c30]">
                    Quality Attributes
                  </label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'Freshness',
                      'Packaging Quality',
                      'Value for Money',
                      'Taste / Flavour',
                      'Overall Satisfaction'
                    ].map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer border ${
                            isSelected
                              ? 'bg-[#0037b0] text-white border-[#0037b0]'
                              : 'bg-[#eff4ff] text-[#565e74] border-[#dae2fd]'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-[#0b1c30]">
                      Your Verified Review *
                    </label>
                    <span className="text-[11px] text-[#565e74] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#0037b0]">psychology</span>
                      Scored by ML Sentiment Model
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe product freshness, packaging condition, taste, and value..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-[#eff4ff] border border-[#dae2fd] p-3 rounded-xl text-[13px] text-[#0b1c30] outline-none focus:bg-white focus:border-[#0037b0] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#0037b0] hover:bg-[#1d4ed8] text-white rounded-xl text-[14px] font-bold shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  <span>Post Verified Review to Store Database</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ML SENTIMENT ANALYSIS SCORECARD & TOTAL COUNTS                           */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#dae2fd] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#eff4ff]">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0037b0] text-[22px]">
                  psychology
                </span>
                <h3 className="font-headline font-bold text-[16px] text-[#0b1c30]">
                  Customer Sentiment Analysis (ML Model)
                </h3>
              </div>
              <p className="text-[11px] text-[#565e74] mt-0.5">
                Powered by an offline Naive Bayes &amp; Lexicon Hybrid classifier trained on 70+ retail product reviews.
              </p>
            </div>

            <button
              onClick={() => setShowDatasetModal(true)}
              className="px-3 py-1.5 bg-[#eff4ff] hover:bg-[#dce1ff] text-[#0037b0] rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span>Inspect &amp; Download Dataset</span>
            </button>
          </div>

          {/* Metric Badges: Positive, Negative, Neutral, Total */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Total Reviews */}
            <div className="bg-[#f8f9ff] border border-[#dae2fd] rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase text-[#565e74] block">
                Total Reviews
              </span>
              <span className="font-headline font-bold text-[22px] text-[#0b1c30] block">
                {sentimentSummary.total}
              </span>
              <span className="text-[10px] text-[#565e74]">100% Processed</span>
            </div>

            {/* Positive Reviews */}
            <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase text-[#065f46] block flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[13px]">thumb_up</span>
                Positive
              </span>
              <span className="font-headline font-bold text-[22px] text-[#047857] block">
                {sentimentSummary.positive}
              </span>
              <span className="text-[10px] font-bold text-[#059669]">
                {sentimentSummary.positivePercentage}% of total
              </span>
            </div>

            {/* Negative Reviews */}
            <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase text-[#991b1b] block flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[13px]">thumb_down</span>
                Negative
              </span>
              <span className="font-headline font-bold text-[22px] text-[#b91c1c] block">
                {sentimentSummary.negative}
              </span>
              <span className="text-[10px] font-bold text-[#dc2626]">
                {sentimentSummary.negativePercentage}% of total
              </span>
            </div>

            {/* Neutral Reviews */}
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase text-[#475569] block flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[13px]">balance</span>
                Neutral
              </span>
              <span className="font-headline font-bold text-[22px] text-[#334155] block">
                {sentimentSummary.neutral}
              </span>
              <span className="text-[10px] font-bold text-[#64748b]">
                {sentimentSummary.neutralPercentage}% of total
              </span>
            </div>
          </div>

          {/* Sentiment Distribution Bar */}
          {sentimentSummary.total > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-[#565e74]">
                <span>Sentiment Ratio Breakdown</span>
                <span className="font-mono text-[10px]">
                  Positive: {sentimentSummary.positivePercentage}% | Negative: {sentimentSummary.negativePercentage}%
                </span>
              </div>
              <div className="w-full h-3 bg-[#e2e8f0] rounded-full overflow-hidden flex">
                <div
                  className="bg-[#10b981] transition-all duration-300"
                  style={{ width: `${sentimentSummary.positivePercentage}%` }}
                  title={`Positive: ${sentimentSummary.positivePercentage}%`}
                />
                <div
                  className="bg-[#94a3b8] transition-all duration-300"
                  style={{ width: `${sentimentSummary.neutralPercentage}%` }}
                  title={`Neutral: ${sentimentSummary.neutralPercentage}%`}
                />
                <div
                  className="bg-[#ef4444] transition-all duration-300"
                  style={{ width: `${sentimentSummary.negativePercentage}%` }}
                  title={`Negative: ${sentimentSummary.negativePercentage}%`}
                />
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* CLEARLY CATEGORIZED REVIEW LIST WITH FILTER TABS                          */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#e5eeff] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#eff4ff]">
            <div>
              <h3 className="font-headline font-bold text-[15px] text-[#0b1c30]">
                Customer Feedback Categorization
              </h3>
              <p className="text-[11px] text-[#565e74]">
                Browse reviews sorted and categorized by the ML sentiment classifier.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSentimentFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  sentimentFilter === 'all'
                    ? 'bg-[#0037b0] text-white shadow-xs'
                    : 'bg-[#eff4ff] text-[#565e74] hover:bg-[#dae2fd]'
                }`}
              >
                All ({enrichedReviews.length})
              </button>
              <button
                onClick={() => setSentimentFilter('Positive')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  sentimentFilter === 'Positive'
                    ? 'bg-[#047857] text-white shadow-xs'
                    : 'bg-[#ecfdf5] text-[#047857] hover:bg-[#d1fae5]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">thumb_up</span>
                <span>Positive ({sentimentSummary.positive})</span>
              </button>
              <button
                onClick={() => setSentimentFilter('Negative')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  sentimentFilter === 'Negative'
                    ? 'bg-[#b91c1c] text-white shadow-xs'
                    : 'bg-[#fef2f2] text-[#b91c1c] hover:bg-[#fee2e2]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">thumb_down</span>
                <span>Negative ({sentimentSummary.negative})</span>
              </button>
              <button
                onClick={() => setSentimentFilter('Neutral')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  sentimentFilter === 'Neutral'
                    ? 'bg-[#475569] text-white shadow-xs'
                    : 'bg-[#f8fafc] text-[#475569] hover:bg-[#e2e8f0]'
                }`}
              >
                <span>Neutral ({sentimentSummary.neutral})</span>
              </button>
            </div>
          </div>

          {/* Review List */}
          {filteredReviews.length === 0 ? (
            <div className="text-center py-10 text-[#565e74] text-[12px] space-y-1">
              <span className="material-symbols-outlined text-[32px] text-[#dae2fd] block">
                rate_review
              </span>
              <p className="font-semibold text-[#0b1c30]">
                No reviews found in &quot;{sentimentFilter}&quot; category.
              </p>
              <p className="text-[11px]">
                {enrichedReviews.length === 0
                  ? 'Be the first verified customer to submit a review!'
                  : 'Try selecting a different filter tab above.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#eff4ff] space-y-3 pt-1">
              {filteredReviews.map((rev) => {
                const isPos = rev.sentiment === 'Positive';
                const isNeg = rev.sentiment === 'Negative';
                const confidencePct = Math.round((rev.sentimentConfidence || 0.85) * 100);

                return (
                  <div key={rev.id} className="pt-3.5 space-y-2">
                    {/* Top Row: User Phone, Verified Pill, Timestamp, ML Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[13px] text-[#0b1c30]">
                          {rev.customerPhone
                            ? `Buyer (${rev.customerPhone.replace(/.*(\d{4})$/, '***$1')})`
                            : 'Verified Customer'}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-[#85f8c4] text-[#002114] text-[9px] font-bold">
                          VERIFIED PURCHASE ✓
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Sentiment Label Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                            isPos
                              ? 'bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]'
                              : isNeg
                              ? 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]'
                              : 'bg-[#f8fafc] text-[#475569] border border-[#e2e8f0]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[12px]">
                            {isPos ? 'thumb_up' : isNeg ? 'thumb_down' : 'balance'}
                          </span>
                          <span>
                            {rev.sentiment || 'Neutral'} ({confidencePct}% ML confidence)
                          </span>
                        </span>
                        <span className="text-[11px] text-[#565e74]">{rev.timestamp}</span>
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center gap-1 text-[#ffab00]">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          className="material-symbols-outlined text-[16px]"
                          style={{ fontVariationSettings: s <= rev.rating ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          star
                        </span>
                      ))}
                    </div>

                    {/* Quality Tags & Extracted Sentiment Keywords */}
                    <div className="flex flex-wrap items-center gap-1">
                      {rev.tags &&
                        rev.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 bg-[#eff4ff] text-[#0037b0] text-[10px] rounded-full font-medium"
                          >
                            {t}
                          </span>
                        ))}

                      {/* Display ML Extracted Keywords if detected */}
                      {rev.sentimentKeywords && rev.sentimentKeywords.length > 0 && (
                        <span className="text-[10px] text-[#565e74] flex items-center gap-1 pl-1">
                          <span className="font-semibold text-[#0b1c30]">ML Signals:</span>
                          {rev.sentimentKeywords.map((kw) => (
                            <span
                              key={kw}
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                isPos
                                  ? 'bg-[#d1fae5] text-[#065f46]'
                                  : isNeg
                                  ? 'bg-[#fee2e2] text-[#991b1b]'
                                  : 'bg-[#e2e8f0] text-[#334155]'
                              }`}
                            >
                              &quot;{kw}&quot;
                            </span>
                          ))}
                        </span>
                      )}
                    </div>

                    {/* Customer Comment Text */}
                    <p className="text-[12px] text-[#434655] leading-relaxed bg-[#fbfcfe] p-2.5 rounded-lg border border-[#f1f5f9]">
                      {rev.comment}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL: ML SENTIMENT TRAINING DATASET INSPECTOR & DOWNLOAD                 */}
      {/* ========================================================================= */}
      {showDatasetModal && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-[#e5eeff] space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff] shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0037b0] text-[24px]">database</span>
                <div>
                  <h3 className="font-headline font-bold text-[17px] text-[#0b1c30]">
                    Sentiment Classifier Training Dataset
                  </h3>
                  <p className="text-[11px] text-[#565e74]">
                    Supervised retail product feedback dataset ({datasetList.length} labeled training vectors)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDatasetModal(false)}
                className="w-8 h-8 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#565e74] hover:text-[#0b1c30] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Model Architecture & Action Row */}
            <div className="bg-[#f8f9ff] p-3 rounded-xl border border-[#dae2fd] text-[11px] text-[#565e74] space-y-1.5 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-[#0b1c30] block">
                    Architecture: Multinomial Naive Bayes + Retail Domain Lexicon
                  </span>
                  <span>
                    Features: Token n-grams with negation handling (e.g. &quot;not fresh&quot; → &quot;not_fresh&quot;) + Laplace smoothing.
                  </span>
                </div>
                <button
                  onClick={handleDownloadDataset}
                  className="px-3.5 py-1.5 bg-[#0037b0] hover:bg-[#1d4ed8] text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  <span>Download Dataset (JSON)</span>
                </button>
              </div>
            </div>

            {/* Search filter for dataset */}
            <div className="shrink-0 flex items-center gap-2 bg-[#eff4ff] border border-[#dae2fd] rounded-xl px-3 py-2">
              <span className="material-symbols-outlined text-[#565e74] text-[16px]">search</span>
              <input
                type="text"
                placeholder="Search training text, label (Positive/Negative/Neutral), or category..."
                value={datasetSearch}
                onChange={(e) => setDatasetSearch(e.target.value)}
                className="w-full bg-transparent text-[12px] text-[#0b1c30] outline-none"
              />
            </div>

            {/* Dataset Table */}
            <div className="flex-1 overflow-y-auto border border-[#dae2fd] rounded-xl">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-[#f1f5f9] text-[#0b1c30] font-bold sticky top-0 border-b border-[#dae2fd]">
                  <tr>
                    <th className="p-2 w-14">ID</th>
                    <th className="p-2 w-24">Category</th>
                    <th className="p-2">Training Review Text</th>
                    <th className="p-2 w-16 text-center">Stars</th>
                    <th className="p-2 w-24 text-center">Label</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eff4ff]">
                  {filteredDataset.map((item) => {
                    const isPos = item.label === 'Positive';
                    const isNeg = item.label === 'Negative';
                    return (
                      <tr key={item.id} className="hover:bg-[#f8f9ff]">
                        <td className="p-2 font-mono text-[#565e74]">{item.id}</td>
                        <td className="p-2 font-medium text-[#0b1c30]">{item.category}</td>
                        <td className="p-2 text-[#434655] italic">&quot;{item.text}&quot;</td>
                        <td className="p-2 text-center text-[#ffab00] font-bold">★ {item.rating}</td>
                        <td className="p-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                              isPos
                                ? 'bg-[#ecfdf5] text-[#047857]'
                                : isNeg
                                ? 'bg-[#fef2f2] text-[#b91c1c]'
                                : 'bg-[#f8fafc] text-[#475569]'
                            }`}
                          >
                            {item.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-[#565e74] shrink-0">
              <span>Showing {filteredDataset.length} of {datasetList.length} training samples</span>
              <button
                onClick={() => setShowDatasetModal(false)}
                className="px-4 py-1.5 bg-[#eff4ff] hover:bg-[#dae2fd] text-[#0b1c30] font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
