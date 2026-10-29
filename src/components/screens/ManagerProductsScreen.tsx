import React, { useState } from 'react';
import { CustomerReview, ProductItem, RestockRequest, RoleType, ShopProfile } from '../../types';
import { QRCodeSVG } from '../../utils/qrGenerator';
import { COUNTRY_CODES, validateEmail, validatePhoneNumber } from '../../utils/validation';
import { classifyReview } from '../../ml/sentimentModel';

interface ManagerProductsScreenProps {
  products: ProductItem[];
  restockRequests: RestockRequest[];
  reviews: CustomerReview[];
  currentShop: ShopProfile;
  activeRole: RoleType;
  onAddProduct: (product: ProductItem) => void;
  onRemoveProduct: (productId: string) => void;
  onUpdateStock: (productId: string, newStock: number) => void;
  onApproveRestock: (request: RestockRequest) => void;
  onShowFeedbackPage: (product: ProductItem) => void;
  onShowToast: (msg: string) => void;
}

export const ManagerProductsScreen: React.FC<ManagerProductsScreenProps> = ({
  products,
  restockRequests,
  reviews,
  currentShop,
  activeRole,
  onAddProduct,
  onRemoveProduct,
  onUpdateStock,
  onApproveRestock,
  onShowFeedbackPage,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'restock'>('catalog');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedQrProduct, setSelectedQrProduct] = useState<ProductItem | null>(null);
  const [expandedReviewsProductId, setExpandedReviewsProductId] = useState<string | null>(null);

  // Stock Edit Modal State
  const [stockEditProduct, setStockEditProduct] = useState<ProductItem | null>(null);
  const [newStockInput, setNewStockInput] = useState<string>('');

  // Product Add Form State
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [price, setPrice] = useState('');
  const [availableStock, setAvailableStock] = useState('');
  const [minThreshold, setMinThreshold] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierCountryCode, setSupplierCountryCode] = useState('+91');
  const [supplierPhone, setSupplierPhone] = useState('');

  const isManagerOrOwner = activeRole === 'Manager' || activeRole === 'Owner';
  const shopProducts = products.filter((p) => !p.shopId || p.shopId === currentShop.id);
  const shopRestockRequests = restockRequests.filter((r) => !r.shopId || r.shopId === currentShop.id);
  const shopReviews = reviews.filter((r) => !r.shopId || r.shopId === currentShop.id);
  const pendingRequests = shopRestockRequests.filter((r) => r.status === 'Pending');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !name.trim() ||
      !brand.trim() ||
      !price ||
      !availableStock ||
      !minThreshold ||
      !supplierName.trim() ||
      !supplierEmail.trim()
    ) {
      onShowToast(
        'Please fill in all required fields (Product Name, Brand, Price, Stock, Threshold, Supplier Info).'
      );
      return;
    }

    // Validate supplier email format
    if (!validateEmail(supplierEmail.trim())) {
      onShowToast('Invalid supplier email: please enter a valid email address (e.g. supplier@company.com).');
      return;
    }

    // Validate supplier phone if provided
    let formattedSupplierPhone = '';
    if (supplierPhone.trim()) {
      const phoneValidation = validatePhoneNumber(supplierCountryCode, supplierPhone);
      if (!phoneValidation.isValid) {
        onShowToast(`Supplier Phone: ${phoneValidation.message}`);
        return;
      }
      formattedSupplierPhone = `${supplierCountryCode} ${supplierPhone.trim().replace(/\D/g, '')}`;
    }

    const prodId = `prod-${Date.now()}`;
    const skuCode = `SKU-${Math.floor(100 + Math.random() * 900)}`;
    const qrFeedbackUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/?feedback=${prodId}`
        : `QR-FEEDBACK-${skuCode}`;

    const newProduct: ProductItem = {
      id: prodId,
      shopId: currentShop.id,
      sku: skuCode,
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      price: parseFloat(price) || 0,
      availableStock: parseInt(availableStock, 10) || 0,
      minThreshold: parseInt(minThreshold, 10) || 0,
      supplierName: supplierName.trim(),
      supplierEmail: supplierEmail.trim().toLowerCase(),
      supplierPhone: formattedSupplierPhone,
      qrCode: qrFeedbackUrl,
      createdAt: new Date().toISOString()
    };

    onAddProduct(newProduct);
    setShowAddModal(false);
    setName('');
    setBrand('');
    setPrice('');
    setAvailableStock('');
    setMinThreshold('');
    setSupplierName('');
    setSupplierEmail('');
    setSupplierPhone('');
    onShowToast(`Product "${newProduct.name}" added and packaging QR code generated!`);
  };

  const handleRemove = (product: ProductItem) => {
    if (!isManagerOrOwner) {
      onShowToast('Only Manager or Owner can remove products.');
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to remove "${product.name}" (${product.brand})? This will update the database.`
      )
    ) {
      onRemoveProduct(product.id);
      onShowToast(`Product "${product.name}" removed from database.`);
    }
  };

  const handleApprove = (request: RestockRequest) => {
    onApproveRestock(request);

    // Open supplier email page without a draft for requesting more stock in the quantity of minimum threshold
    const subject = encodeURIComponent(`Restock Request: ${request.productName} (${request.brand})`);
    const body = encodeURIComponent(
      `Dear ${request.supplierName},\n\nPlease dispatch ${request.minThreshold} units of ${request.productName} (${request.brand}) to ${currentShop.name}.\n\nCurrent Stock: ${request.currentStock}\nSafety Threshold: ${request.minThreshold}\nRequested Replenishment: ${request.minThreshold} units\n\nThank you,\n${currentShop.name} Management`
    );

    const mailtoUrl = `mailto:${request.supplierEmail}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');
    onShowToast(`Restock request approved! Mail window opened for ${request.supplierEmail}.`);

    // Keep an option for the manager to edit the stock too
    const prod = products.find((p) => p.id === request.productId);
    if (prod) {
      setStockEditProduct(prod);
      setNewStockInput(String(prod.availableStock));
    }
  };

  const handleOpenEditStock = (product: ProductItem) => {
    setStockEditProduct(product);
    setNewStockInput(String(product.availableStock));
  };

  const handleSaveStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockEditProduct) return;

    const parsed = parseInt(newStockInput, 10);
    if (isNaN(parsed) || parsed < 0) {
      onShowToast('Please enter a valid non-negative stock quantity.');
      return;
    }

    onUpdateStock(stockEditProduct.id, parsed);
    onShowToast(`Stock for "${stockEditProduct.name}" updated to ${parsed} units in database.`);
    setStockEditProduct(null);
  };

  const handleCopyQrLink = (url: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      onShowToast('Feedback URL copied to clipboard!');
    }
  };

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#e5eeff] shadow-xs">
        <div>
          <h2 className="font-headline font-bold text-[18px] text-[#0b1c30]">
            Centralized Inventory & Stock Operations
          </h2>
          <p className="text-[12px] text-[#565e74]">
            Manage products, stock levels, threshold monitoring, and packaging QR codes.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Sub tabs: Catalog vs Restock Requests */}
          <div className="bg-[#eff4ff] p-1 rounded-lg flex items-center gap-1 border border-[#dae2fd]">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-bold cursor-pointer transition-colors ${
                activeTab === 'catalog'
                  ? 'bg-white text-[#0037b0] shadow-xs'
                  : 'text-[#565e74] hover:text-[#0b1c30]'
              }`}
            >
              Catalog ({shopProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('restock')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-bold cursor-pointer transition-colors relative flex items-center gap-1.5 ${
                activeTab === 'restock'
                  ? 'bg-white text-[#0037b0] shadow-xs'
                  : 'text-[#565e74] hover:text-[#0b1c30]'
              }`}
            >
              <span>Restock Requests</span>
              {pendingRequests.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
              )}
            </button>
          </div>

          {/* Add Product Button (Manager/Owner only) */}
          {isManagerOrOwner && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#0037b0] hover:bg-[#1d4ed8] text-white text-[12px] font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">add_box</span>
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Restock Notification Banner if active */}
      {pendingRequests.length > 0 && activeTab === 'catalog' && (
        <div className="bg-[#ffdad6] border border-[#ffb4ab] rounded-xl p-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 text-[#93000a]">
            <span className="material-symbols-outlined text-[20px]">warning</span>
            <span className="text-[12px] font-bold">
              {pendingRequests.length} product(s) have fallen below their minimum threshold!
            </span>
          </div>
          <button
            onClick={() => setActiveTab('restock')}
            className="px-2.5 py-1 rounded bg-[#ba1a1a] text-white text-[11px] font-bold hover:bg-[#93000a] cursor-pointer"
          >
            Review Restock →
          </button>
        </div>
      )}

      {/* TAB 1: PRODUCT CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-3">
          {shopProducts.length === 0 ? (
            <div className="bg-white rounded-xl p-10 border border-[#e5eeff] text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#0037b0] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[28px]">shelves</span>
              </div>
              <h3 className="font-headline font-bold text-[16px] text-[#0b1c30]">
                No Products in Catalog Yet
              </h3>
              <p className="text-[12px] text-[#565e74] max-w-sm mx-auto">
                {isManagerOrOwner
                  ? 'Click "Add Product" to create your first item with supplier details, minimum threshold, and packaging QR code.'
                  : 'The Manager has not added any products yet.'}
              </p>
              {isManagerOrOwner && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-[#0037b0] hover:bg-[#1d4ed8] text-white text-[12px] font-bold rounded-lg shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Add First Product</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {shopProducts.map((product) => {
                const isBelowThreshold = product.availableStock <= product.minThreshold;
                const productReviews = shopReviews.filter((r) => r.productId === product.id);
                const posReviews = productReviews.filter((r) => {
                  const s = r.sentiment || classifyReview(r.comment, r.rating).sentiment;
                  return s === 'Positive';
                });
                const negReviews = productReviews.filter((r) => {
                  const s = r.sentiment || classifyReview(r.comment, r.rating).sentiment;
                  return s === 'Negative';
                });
                const avgRating =
                  productReviews.length > 0
                    ? (
                        productReviews.reduce((sum, r) => sum + r.rating, 0) /
                        productReviews.length
                      ).toFixed(1)
                    : null;
                const isExpanded = expandedReviewsProductId === product.id;

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl p-4 shadow-xs border border-[#e5eeff] space-y-3 flex flex-col justify-between hover:border-[#b7c4ff] transition-all"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-[#565e74] uppercase font-mono">
                            {product.sku}
                          </span>
                          <h4 className="font-headline font-bold text-[15px] text-[#0b1c30] truncate">
                            {product.name}
                          </h4>
                          <span className="text-[12px] text-[#565e74]">
                            Brand: <strong>{product.brand}</strong> • {product.category}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-headline font-bold text-[18px] text-[#0037b0] tabular-nums block">
                            ₹{product.price}
                          </span>
                        </div>
                      </div>

                      {/* Stock & Threshold Metrics */}
                      <div className="mt-2.5 p-2.5 bg-[#eff4ff] border border-[#dae2fd] rounded-lg grid grid-cols-2 gap-2 text-[12px]">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#565e74] text-[11px]">Available Stock</span>
                            {isManagerOrOwner && (
                              <button
                                onClick={() => handleOpenEditStock(product)}
                                className="text-[10px] text-[#0037b0] font-bold hover:underline cursor-pointer"
                                title="Edit Stock Quantity"
                              >
                                Edit Stock
                              </button>
                            )}
                          </div>
                          <span
                            className={`font-headline font-bold text-[16px] tabular-nums ${
                              isBelowThreshold ? 'text-[#ba1a1a]' : 'text-[#004f35]'
                            }`}
                          >
                            {product.availableStock} units
                          </span>
                        </div>
                        <div>
                          <span className="text-[#565e74] text-[11px] block">Min Threshold</span>
                          <span className="font-headline font-bold text-[16px] text-[#0b1c30] tabular-nums">
                            {product.minThreshold} units
                          </span>
                        </div>
                      </div>

                      {isBelowThreshold && (
                        <div className="mt-1.5 text-[11px] font-bold text-[#ba1a1a] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">warning</span>
                          <span>Breached minimum threshold! Restock request active.</span>
                        </div>
                      )}

                      {/* Supplier Information */}
                      <div className="mt-2 text-[11px] text-[#565e74] space-y-0.5 border-t border-[#eff4ff] pt-2">
                        <p>
                          Supplier: <strong>{product.supplierName}</strong>
                        </p>
                        <p>
                          Email: {product.supplierEmail}{' '}
                          {product.supplierPhone ? `• ${product.supplierPhone}` : ''}
                        </p>
                      </div>

                      {/* Customer Reviews Section under Product Description */}
                      <div className="mt-3 pt-2.5 border-t border-[#eff4ff] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="flex items-center text-[#eab308]">
                              <span className="material-symbols-outlined text-[16px] fill-current">
                                star
                              </span>
                            </div>
                            <span className="text-[12px] font-bold text-[#0b1c30]">
                              {avgRating ? (
                                <>
                                  {avgRating} / 5.0{' '}
                                  <span className="text-[#565e74] font-normal">
                                    ({productReviews.length} verified review{productReviews.length === 1 ? '' : 's'})
                                  </span>
                                </>
                              ) : (
                                <span className="text-[#565e74] text-[11px] font-normal">
                                  No customer reviews yet
                                </span>
                              )}
                            </span>

                            {/* ML Sentiment Badges */}
                            {productReviews.length > 0 && (
                              <div className="flex items-center gap-1 ml-1">
                                <span className="px-1.5 py-0.5 rounded bg-[#ecfdf5] text-[#047857] text-[10px] font-bold border border-[#a7f3d0] flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">thumb_up</span>
                                  {posReviews.length} Positive
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-[#fef2f2] text-[#b91c1c] text-[10px] font-bold border border-[#fecaca] flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">thumb_down</span>
                                  {negReviews.length} Negative
                                </span>
                              </div>
                            )}
                          </div>

                          {productReviews.length > 0 && (
                            <button
                              onClick={() =>
                                setExpandedReviewsProductId(
                                  isExpanded ? null : product.id
                                )
                              }
                              className="text-[11px] text-[#0037b0] font-bold hover:underline cursor-pointer flex items-center gap-0.5 shrink-0"
                            >
                              <span>{isExpanded ? 'Hide Reviews' : 'View Reviews'}</span>
                              <span className="material-symbols-outlined text-[14px]">
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Expandable Review Details */}
                        {isExpanded && productReviews.length > 0 && (
                          <div className="space-y-2 mt-2 bg-[#f8f9ff] p-2.5 rounded-lg border border-[#dae2fd] max-h-48 overflow-y-auto">
                            {productReviews.map((rev) => {
                              const ml = rev.sentiment
                                ? { sentiment: rev.sentiment, confidence: rev.sentimentConfidence || 0.9, keywords: rev.sentimentKeywords || [] }
                                : classifyReview(rev.comment, rev.rating);
                              const isPos = ml.sentiment === 'Positive';
                              const isNeg = ml.sentiment === 'Negative';

                              return (
                                <div
                                  key={rev.id}
                                  className="bg-white p-2 rounded-md border border-[#e5eeff] text-[11px] space-y-1 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between text-[#565e74]">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-[#0b1c30]">
                                        {rev.customerPhone.replace(/(\d{2})\d{4}(\d{4})/, '$1****$2')}
                                      </span>
                                      <span className="px-1.5 py-0.2 bg-[#dcfce7] text-[#166534] rounded text-[9px] font-bold inline-flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-[10px]">verified</span>
                                        Verified
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-0.5 ${
                                          isPos
                                            ? 'bg-[#ecfdf5] text-[#047857]'
                                            : isNeg
                                            ? 'bg-[#fef2f2] text-[#b91c1c]'
                                            : 'bg-[#f8fafc] text-[#475569]'
                                        }`}
                                      >
                                        <span className="material-symbols-outlined text-[10px]">
                                          {isPos ? 'thumb_up' : isNeg ? 'thumb_down' : 'balance'}
                                        </span>
                                        {ml.sentiment} ({Math.round(ml.confidence * 100)}%)
                                      </span>
                                    </div>
                                    <span>{rev.timestamp}</span>
                                  </div>
                                  <div className="flex items-center text-[#eab308] text-[12px]">
                                    {'★'.repeat(rev.rating)}
                                    <span className="text-gray-300">
                                      {'☆'.repeat(5 - rev.rating)}
                                    </span>
                                  </div>
                                  <p className="text-[#0b1c30] italic">"{rev.comment}"</p>
                                  {rev.tags && rev.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                      {rev.tags.map((tag) => (
                                        <span
                                          key={tag}
                                          className="text-[9px] px-1.5 py-0.5 bg-[#eff4ff] text-[#0037b0] rounded font-medium"
                                        >
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions: QR Code, Feedback Page, Edit Stock, & Remove */}
                    <div className="pt-2 border-t border-[#eff4ff] flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedQrProduct(product)}
                          className="px-2.5 py-1 bg-[#eff4ff] hover:bg-[#dce1ff] text-[#0037b0] rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
                          <span>Packaging QR</span>
                        </button>

                        <button
                          onClick={() => onShowFeedbackPage(product)}
                          className="px-2 py-1 text-[#565e74] hover:text-[#0b1c30] text-[11px] font-semibold cursor-pointer"
                        >
                          Feedback Page
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isManagerOrOwner && (
                          <button
                            onClick={() => handleOpenEditStock(product)}
                            className="px-2 py-1 bg-[#f8f9ff] hover:bg-[#eff4ff] text-[#0b1c30] border border-[#dae2fd] rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            <span>Edit Stock</span>
                          </button>
                        )}

                        {isManagerOrOwner && (
                          <button
                            onClick={() => handleRemove(product)}
                            className="text-[#ba1a1a] hover:text-[#93000a] text-[11px] font-bold p-1 cursor-pointer flex items-center gap-0.5"
                            title="Remove product from catalog"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RESTOCK REQUESTS QUEUE */}
      {activeTab === 'restock' && (
        <div className="space-y-3">
          {shopRestockRequests.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-[#e5eeff] text-center space-y-2">
              <span className="material-symbols-outlined text-[32px] text-[#004f35]">
                check_circle
              </span>
              <h3 className="font-headline font-bold text-[16px] text-[#0b1c30]">
                All Products Above Minimum Threshold
              </h3>
              <p className="text-[12px] text-[#565e74]">
                When product stock drops below the defined minimum threshold, automatic restocking requests appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {shopRestockRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-xl p-4 border border-[#e5eeff] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-bold text-[14px] text-[#0b1c30]">
                        {req.productName} ({req.brand})
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.status === 'Pending'
                            ? 'bg-[#ffdad6] text-[#93000a]'
                            : 'bg-[#dcfce7] text-[#166534]'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="text-[12px] text-[#565e74] flex flex-wrap gap-x-4 gap-y-1">
                      <span>Current Stock: <strong className="text-[#ba1a1a]">{req.currentStock} units</strong></span>
                      <span>Min Threshold: <strong>{req.minThreshold} units</strong></span>
                      <span>Supplier: <strong>{req.supplierName}</strong> ({req.supplierEmail})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {req.status === 'Pending' && isManagerOrOwner && (
                      <button
                        onClick={() => handleApprove(req)}
                        className="px-3 py-1.5 bg-[#004f35] hover:bg-[#003824] text-white text-[12px] font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">mail</span>
                        <span>Approve & Email Supplier</span>
                      </button>
                    )}

                    {isManagerOrOwner && (
                      <button
                        onClick={() => {
                          const prod = products.find((p) => p.id === req.productId);
                          if (prod) handleOpenEditStock(prod);
                        }}
                        className="px-2.5 py-1.5 border border-[#dae2fd] text-[#0b1c30] text-[12px] font-semibold rounded-lg hover:bg-[#eff4ff] cursor-pointer"
                      >
                        Edit Stock
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD PRODUCT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e5eeff] space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#eff4ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0037b0]">add_box</span>
                <h3 className="font-headline font-bold text-[16px] text-[#0b1c30]">
                  Add New Product to Shop Catalog
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#565e74] hover:text-[#0b1c30] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#565e74] uppercase mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Natural Honey 250g"
                    className="w-full px-3 py-1.5 border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:border-[#0037b0]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#565e74] uppercase mb-1">
                    Brand *
                  </label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Apex Apiaries"
                    className="w-full px-3 py-1.5 border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:border-[#0037b0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#565e74] uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:border-[#0037b0] bg-white"
                  >
                    <option value="Pantry & Sweeteners">Pantry & Sweeteners</option>
                    <option value="Beverages & Dairy">Beverages & Dairy</option>
                    <option value="Snacks & Bakery">Snacks & Bakery</option>
                    <option value="Grains & Flours">Grains & Flours</option>
                    <option value="Personal Care">Personal Care</option>
                    <option value="Groceries">Groceries</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#565e74] uppercase mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="190.00"
                    className="w-full px-3 py-1.5 border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:border-[#0037b0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 bg-[#eff4ff] p-2.5 rounded-xl border border-[#dae2fd]">
                <div>
                  <label className="block text-[11px] font-bold text-[#0037b0] uppercase mb-1">
                    Available Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={availableStock}
                    onChange={(e) => setAvailableStock(e.target.value)}
                    placeholder="18"
                    className="w-full px-3 py-1.5 bg-white border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:border-[#0037b0]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#0037b0] uppercase mb-1">
                    Min Threshold *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-1.5 bg-white border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:border-[#0037b0]"
                  />
                </div>
              </div>

              {/* Supplier Info */}
              <div className="space-y-2 border-t border-[#eff4ff] pt-2">
                <span className="text-[11px] font-bold text-[#565e74] uppercase tracking-wider block">
                  Supplier Details (For Automated Replenishment)
                </span>
                <div>
                  <label className="block text-[11px] font-medium text-[#565e74] mb-0.5">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. Apex Apiaries Direct"
                    className="w-full px-3 py-1.5 border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:border-[#0037b0]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#565e74] mb-0.5">
                      Supplier Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={supplierEmail}
                      onChange={(e) => setSupplierEmail(e.target.value)}
                      placeholder="procure@apexapiaries.com"
                      className="w-full px-3 py-1.5 border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:border-[#0037b0]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#565e74] mb-0.5">
                      Supplier Phone
                    </label>
                    <div className="flex gap-1">
                      <select
                        value={supplierCountryCode}
                        onChange={(e) => setSupplierCountryCode(e.target.value)}
                        className="w-24 px-1.5 py-1.5 border border-[#c3cadb] rounded-lg text-[11px] text-[#0b1c30] bg-[#f8f9ff] outline-none cursor-pointer"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={supplierPhone}
                        onChange={(e) => setSupplierPhone(e.target.value)}
                        placeholder="Digits only"
                        className="flex-1 px-2.5 py-1.5 border border-[#c3cadb] rounded-lg text-[13px] text-[#0b1c30] focus:outline-none focus:border-[#0037b0]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#eff4ff]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-[12px] font-semibold text-[#565e74] hover:text-[#0b1c30] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0037b0] hover:bg-[#1d4ed8] text-white text-[12px] font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Save & Generate Packaging QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT STOCK */}
      {stockEditProduct && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#e5eeff] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#eff4ff]">
              <h3 className="font-headline font-bold text-[15px] text-[#0b1c30]">
                Edit Stock: {stockEditProduct.name}
              </h3>
              <button
                onClick={() => setStockEditProduct(null)}
                className="text-[#565e74] hover:text-[#0b1c30] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#565e74] uppercase mb-1">
                  New Available Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newStockInput}
                  onChange={(e) => setNewStockInput(e.target.value)}
                  className="w-full px-3 py-2 border border-[#c3cadb] rounded-lg text-[15px] font-bold text-[#0b1c30] focus:outline-none focus:border-[#0037b0]"
                />
                <span className="text-[11px] text-[#565e74] mt-1 block">
                  Safety threshold is set to {stockEditProduct.minThreshold} units.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#eff4ff]">
                <button
                  type="button"
                  onClick={() => setStockEditProduct(null)}
                  className="px-3 py-1.5 text-[12px] font-semibold text-[#565e74] hover:text-[#0b1c30] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#0037b0] hover:bg-[#1d4ed8] text-white text-[12px] font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW & PRINT PACKAGING QR CODE */}
      {selectedQrProduct && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#e5eeff] text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#eff4ff]">
              <span className="font-headline font-bold text-[14px] text-[#0b1c30]">
                Packaging Feedback QR Code
              </span>
              <button
                onClick={() => setSelectedQrProduct(null)}
                className="text-[#565e74] hover:text-[#0b1c30] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="font-headline font-bold text-[16px] text-[#0b1c30]">
                {selectedQrProduct.name}
              </h4>
              <p className="text-[12px] text-[#565e74]">
                Brand: {selectedQrProduct.brand} • SKU: {selectedQrProduct.sku}
              </p>
            </div>

            {/* Generated QR Code */}
            <div className="flex justify-center py-2">
              <QRCodeSVG value={selectedQrProduct.qrCode} size={180} />
            </div>

            <p className="text-[11px] text-[#565e74] px-4">
              Print and attach this QR code to the product packaging. Customers can scan this code to unlock the verified review portal after purchase.
            </p>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-[#eff4ff]">
              <button
                onClick={() => handleCopyQrLink(selectedQrProduct.qrCode)}
                className="px-3 py-1.5 bg-[#eff4ff] hover:bg-[#dce1ff] text-[#0037b0] text-[12px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">content_copy</span>
                <span>Copy URL</span>
              </button>
              <button
                onClick={() => {
                  onShowFeedbackPage(selectedQrProduct);
                  setSelectedQrProduct(null);
                }}
                className="px-3 py-1.5 bg-[#0037b0] hover:bg-[#1d4ed8] text-white text-[12px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                <span>Open Feedback</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
