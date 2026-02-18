'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, writeBatch, Timestamp, query, orderBy } from 'firebase/firestore';
import { 
  ShoppingCart, Plus, Trash2, Search, 
  FileText, CheckCircle, Loader2, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PurchaseInward() {
  // Dark Mode Only
  const isDarkMode = true;
  
  // Data States
  const [inventory, setInventory] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  
  // Form States
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Cart Logic
  const [cart, setCart] = useState<any[]>([]);
  const [searchItem, setSearchItem] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false, message: '', type: 'success'
  });

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // 1. Load Inventory & Suppliers on Mount
  useEffect(() => {
    const q = query(collection(db, 'inventory'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInventory(items);
      const uniqueSuppliers = Array.from(new Set(items.map((i: any) => i.supplier).filter(Boolean)));
      setSuppliers(uniqueSuppliers as string[]);
    });
    return () => unsub();
  }, []);

  // 2. Add Item to Cart
  const addToCart = () => {
    if (!selectedItem || !qty || !rate) {
      showToast('Please fill item details', 'error');
      return;
    }
    
    const newItem = {
      id: selectedItem.id,
      name: selectedItem.name,
      qty: Number(qty),
      rate: Number(rate),
      total: Number(qty) * Number(rate)
    };

    setCart([...cart, newItem]);
    setSelectedItem(null);
    setSearchItem('');
    setQty('');
    setRate('');
    showToast('Item added to cart');
  };

  // 3. Remove from Cart
  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // 4. SUBMIT PURCHASE
  const handleSubmit = async () => {
    if (!selectedSupplier || !invoiceNo || cart.length === 0) {
      showToast('Fill all details', 'error');
      return;
    }
    setLoading(true);

    const batch = writeBatch(db);

    try {
      // A. Create Purchase Record
      const purchaseRef = doc(collection(db, 'purchases'));
      batch.set(purchaseRef, {
        supplier: selectedSupplier,
        invoiceNo,
        date,
        items: cart,
        totalAmount: cart.reduce((sum, i) => sum + i.total, 0),
        timestamp: Timestamp.now()
      });

      // B. Update Stock in Inventory
      cart.forEach(item => {
        const itemRef = doc(db, 'inventory', item.id);
        const currentStock = inventory.find(i => i.id === item.id)?.stock || 0;
        const newStock = Number(currentStock) + Number(item.qty);
        
        batch.update(itemRef, { 
          stock: newStock,
          price: item.rate,
          lastUpdated: new Date().toISOString()
        });
      });

      await batch.commit();
      
      setCart([]);
      setInvoiceNo('');
      showToast('Inward Successful! Stock Updated.');
      
    } catch (e) {
      console.error(e);
      showToast('Error saving purchase', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter items for search dropdown
  const filteredItems = inventory.filter(i => 
    i.name.toLowerCase().includes(searchItem.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] p-4">
      
      {/* HEADER */}
      <nav 
        className="sticky top-0 z-40 rounded-xl mb-4 bg-zinc-900/80 border-zinc-800/50 border backdrop-blur-xl"
        style={{
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 4px 20px -4px rgb(0 0 0 / 0.3)'
        }}
      >
        <div className="px-4 h-14 flex items-center justify-between">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center"
                style={{ boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.35)' }}>
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div className="absolute inset-0 w-9 h-9 rounded-xl bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
            </div>
            
            <div className="flex flex-col">
              <h1 className="text-base font-semibold tracking-tight leading-tight text-white">
                Purchase Inward
              </h1>
              <span className="text-[10px] font-medium tracking-wide text-zinc-500">
                Record Incoming Materials
              </span>
            </div>
          </div>
          
          {/* Right: Cart Summary */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/50">
              <Package className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-zinc-300">
                {cart.length} items
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* LEFT: INVOICE DETAILS FORM */}
        <div className="bg-zinc-900/80 border-zinc-800/50 border rounded-xl p-4 h-fit"
          style={{
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3)'
          }}
        >
          <h3 className="text-xs font-bold mb-3 uppercase tracking-wider flex items-center gap-2 text-zinc-400">
            <FileText className="w-3.5 h-3.5"/> Invoice Details
          </h3>
           
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold mb-1 block text-zinc-500">SUPPLIER</label>
              <select 
                className="w-full border rounded-lg px-3 py-2 text-sm bg-zinc-800 border-zinc-700 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition"
                value={selectedSupplier}
                onChange={e => setSelectedSupplier(e.target.value)}
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="NEW_SUPPLIER">+ New Supplier</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold mb-1 block text-zinc-500">INVOICE NO.</label>
              <input 
                type="text" 
                className="w-full border rounded-lg px-3 py-2 text-sm bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition"
                placeholder="e.g. INV-2025-001"
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold mb-1 block text-zinc-500">DATE</label>
              <input 
                type="date" 
                className="w-full border rounded-lg px-3 py-2 text-sm bg-zinc-800 border-zinc-700 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: ITEMS CART */}
        <div className="lg:col-span-2 space-y-4">
           
          {/* ADD ITEM BAR */}
          <div className="bg-zinc-900/80 border-zinc-800/50 border p-3 rounded-xl flex flex-wrap gap-3 items-end"
            style={{
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3)'
            }}
          >
            <div className="flex-1 min-w-[180px] relative">
              <label className="text-[10px] font-bold mb-1 block text-zinc-500">SEARCH MATERIAL</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500"/>
                <input 
                  className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition"
                  placeholder="Search Item..."
                  value={searchItem}
                  onChange={e => { setSearchItem(e.target.value); setSelectedItem(null); }}
                />
              </div>
              {/* Dropdown Suggestions */}
              {searchItem && !selectedItem && (
                <div className="absolute top-full left-0 w-full bg-zinc-800 border-zinc-700 border max-h-40 overflow-auto z-50 rounded-b-lg shadow-xl">
                  {filteredItems.map(item => (
                    <div 
                      key={item.id} 
                      className="p-2 text-xs cursor-pointer border-b last:border-0 border-zinc-700 hover:bg-emerald-500 hover:text-white text-zinc-300 transition"
                      onClick={() => { setSelectedItem(item); setSearchItem(item.name); }}
                    >
                      {item.name} <span className="opacity-50 ml-2">({item.stock} in stock)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="w-20">
              <label className="text-[10px] font-bold mb-1 block text-zinc-500">QTY</label>
              <input 
                type="number" 
                className="w-full border rounded-lg px-2 py-2 text-sm text-center bg-zinc-800 border-zinc-700 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition"
                placeholder="0" 
                value={qty} 
                onChange={e => setQty(e.target.value)} 
              />
            </div>

            <div className="w-24">
              <label className="text-[10px] font-bold mb-1 block text-zinc-500">RATE (₹)</label>
              <input 
                type="number" 
                className="w-full border rounded-lg px-2 py-2 text-sm text-center bg-zinc-800 border-zinc-700 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition"
                placeholder="0.00" 
                value={rate} 
                onChange={e => setRate(e.target.value)} 
              />
            </div>

            <button 
              onClick={addToCart} 
              className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all"
              style={{ boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.25)' }}
            >
              <Plus className="w-3.5 h-3.5"/> ADD
            </button>
          </div>

          {/* CART TABLE */}
          <div className="bg-zinc-900/80 border-zinc-800/50 border rounded-xl overflow-hidden min-h-[300px] flex flex-col"
            style={{
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3)'
            }}
          >
            <table className="w-full border-collapse">
              <thead className="bg-gradient-to-r from-zinc-800 to-zinc-850">
                <tr>
                  <th className="text-left text-[10px] uppercase tracking-widest font-bold p-3 border-b text-zinc-500 border-zinc-700 pl-4">Item Name</th>
                  <th className="text-center text-[10px] uppercase tracking-widest font-bold p-3 border-b text-zinc-500 border-zinc-700">Qty</th>
                  <th className="text-right text-[10px] uppercase tracking-widest font-bold p-3 border-b text-zinc-500 border-zinc-700">Rate</th>
                  <th className="text-right text-[10px] uppercase tracking-widest font-bold p-3 border-b text-zinc-500 border-zinc-700">Total</th>
                  <th className="text-center text-[10px] uppercase tracking-widest font-bold p-3 border-b text-zinc-500 border-zinc-700">Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16 text-zinc-600">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                        <p className="text-xs">No items in cart</p>
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, idx) => (
                      <motion.tr 
                        key={idx} 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="hover:bg-zinc-800/50 transition"
                      >
                        <td className="p-3 pl-4 text-xs font-medium border-b text-white border-zinc-800">{item.name}</td>
                        <td className="p-3 text-center text-xs border-b text-emerald-400 border-zinc-800 font-bold">{item.qty}</td>
                        <td className="p-3 text-right text-xs border-b text-zinc-400 border-zinc-800">₹{item.rate}</td>
                        <td className="p-3 text-right text-xs border-b font-bold text-white border-zinc-800">₹{item.total.toFixed(2)}</td>
                        <td className="p-3 text-center border-b border-zinc-800">
                          <button onClick={() => removeFromCart(idx)} className="text-red-500 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>

            {/* FOOTER TOTALS */}
            <div className="mt-auto p-3 border-t flex justify-between items-center bg-gradient-to-r from-zinc-800/50 to-zinc-900/50 border-zinc-800">
              <div>
                <p className="text-[10px] text-zinc-500">Items: {cart.length}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[9px] uppercase font-bold text-zinc-500">Grand Total</p>
                  <h2 className="text-xl font-bold text-white">₹{cart.reduce((sum, i) => sum + i.total, 0).toFixed(2)}</h2>
                </div>
                <button 
                  onClick={handleSubmit} 
                  disabled={loading || cart.length === 0}
                  className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white text-xs font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.25)' }}
                >
                  {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <CheckCircle className="w-4 h-4"/>}
                  SUBMIT INWARD
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: 50 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 50 }}
            className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2 text-sm ${
              toast.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' 
              ? <CheckCircle className="w-4 h-4 text-emerald-500" />
              : <Loader2 className="w-4 h-4 text-red-500" />
            }
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}