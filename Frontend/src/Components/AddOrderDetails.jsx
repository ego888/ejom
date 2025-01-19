import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { 
    validateDetail, 
    calculateArea, 
    calculatePrice, 
    calculateAmount, 
    formatNumber,
    handleApiError,
    calculateTotals,
    validateOrderData,
    calculatePerSqFt,
    calculatePrintHrs
} from '../utils/orderUtils';

function AddOrderDetails({ orderId, onDetailAdded }) {
    const [detail, setDetail] = useState({
        quantity: 0,
        width: 0,
        height: 0,
        unit: '',
        material: '',
        unitPrice: 0,
        discount: 0,
        amount: 0,
        perSqFt: 0,
        remarks: '',
        itemDescription: '',
        top: 0,
        bottom: 0,
        allowanceLeft: 0,
        allowanceRight: 0,
        filename: '',
        squareFeet: 0,
        materialUsage: 0,
        printHrs: 0
    })
    const [units, setUnits] = useState([])
    const [materials, setMaterials] = useState([])

    // Add useEffect to fetch units
    useEffect(() => {
        const fetchUnits = async () => {
            try {
                const token = localStorage.getItem('token')
                const response = await axios.get('http://localhost:3000/auth/units', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (response.data.Status) {
                    console.log('Units fetched:', response.data.Result); // Debug log
                    setUnits(response.data.Result)
                }
            } catch (err) {
                console.log('Error fetching units:', err)
            }
        }
        fetchUnits()
    }, [])

    // Fetch materials on component mount
    useEffect(() => {
        const fetchMaterials = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('http://localhost:3000/auth/materials', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (response.data.Status) {
                    console.log('Materials for edit:', response.data.Result); // Debug log
                    setMaterials(response.data.Result);
                }
            } catch (err) {
                console.log('Error fetching materials:', err);
            }
        };
        fetchMaterials();
    }, []);

    const [showAllowanceModal, setShowAllowanceModal] = useState(false)

    // Handle dimension-related changes
    useEffect(() => {
        if (!detail.width || !detail.height || !detail.unit) return;

        const { squareFeet, materialUsage } = calculateArea(
            detail.width,
            detail.height,
            detail.unit,
            detail.quantity,
            {
                top: detail.top,
                bottom: detail.bottom,
                left: detail.allowanceLeft,
                right: detail.allowanceRight
            }
        );
        
        const price = calculatePrice(squareFeet, detail.perSqFt);
        const amount = calculateAmount(price, detail.discount, detail.quantity);

        // Calculate print hours using the utility function
        const printHrs = calculatePrintHrs(
            squareFeet,
            detail.quantity,
            detail.material,
            materials
        );

        setDetail(prev => ({
            ...prev,
            squareFeet: squareFeet.toFixed(2),
            materialUsage: materialUsage.toFixed(2),
            unitPrice: price.toFixed(2),
            amount: amount.toFixed(2),
            printHrs: printHrs
        }));
    }, [detail.quantity, detail.width, detail.height, detail.unit, detail.material, detail.top, detail.bottom, detail.allowanceLeft, detail.allowanceRight, materials]);

    // Handle price and discount changes
    useEffect(() => {
        if (!detail.unitPrice) return;

        const amount = calculateAmount(detail.unitPrice, detail.discount, detail.quantity);
        const perSqFt = calculatePerSqFt(detail.unitPrice, detail.squareFeet);
        
        setDetail(prev => ({
            ...prev,
            amount: amount.toFixed(2),
            perSqFt: perSqFt
        }));
    }, [detail.unitPrice, detail.discount, detail.quantity, detail.squareFeet]);

    // Handle perSqFt changes
    const handlePerSqFtChange = (e) => {
        const value = e.target.value;  // Raw input value
        
        // Store the raw input value without formatting
        setDetail(prev => ({
            ...prev,
            perSqFt: value
        }));

        // Calculate other values only if we have a valid number
        if (value !== '') {
            const numericValue = parseFloat(value);
            const price = calculatePrice(detail.squareFeet, numericValue);
            const amount = calculateAmount(price, detail.discount, detail.quantity);

            setDetail(prev => ({
                ...prev,
                perSqFt: value,  // Keep the raw input value
                unitPrice: price.toFixed(2),  // Format only the calculated values
                amount: amount.toFixed(2)
            }));
        }
    };

    // Update handleInputChange to use the new handlePerSqFtChange
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'perSqFt') {
            handlePerSqFtChange(e);
        } else {
            setDetail(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const getNextDisplayOrder = async () => {
        try {
            const token = localStorage.getItem('token');
            console.log('Fetching next display order for orderId:', orderId); // Debug log
            const response = await axios.get(
                `http://localhost:3000/auth/next_display_order/${orderId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('Response from next_display_order:', response.data); // Debug log
            const nextOrder = response.data.nextDisplayOrder || 5;
            console.log('Next order number will be:', nextOrder); // Debug log
            return nextOrder;
        } catch (err) {
            console.error('Error getting next display order:', err);
            return 5; // Default to 5 if there's an error
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation 1: Check if all fields are empty
        const isAllEmpty = !detail.quantity && 
                          !detail.width && 
                          !detail.height && 
                          !detail.unit && 
                          !detail.material && 
                          !detail.perSqFt && 
                          !detail.unitPrice && 
                          !detail.discount && 
                          !detail.itemDescription && 
                          !detail.remarks;

        if (isAllEmpty) {
            alert('Please fill at least one field');
            return;
        }

        // Validation 2: If width or height exists, validate required fields
        if (detail.width || detail.height) {
            if (!detail.width || !detail.height || !detail.unit || !detail.material) {
                alert('When entering dimensions, Width, Height, Unit, and Material are required');
                return;
            }
        }

        try {
            const nextDisplayOrder = await getNextDisplayOrder();
            
            // Calculate final values before submission
            const { squareFeet, materialUsage } = calculateArea(
                detail.width,
                detail.height,
                detail.unit,
                detail.quantity,
                {
                    top: detail.top,
                    bottom: detail.bottom,
                    left: detail.allowanceLeft,
                    right: detail.allowanceRight
                }
            );

            // Calculate print hours using the utility function
            const calculatedPrintHrs = calculatePrintHrs(
                parseFloat(squareFeet),
                parseFloat(detail.quantity),
                detail.material,
                materials
            );
            console.log('Calculated Print hours:', calculatedPrintHrs);

            const submissionData = {
                orderId,
                displayOrder: nextDisplayOrder,
                quantity: parseFloat(detail.quantity) || 0,
                width: parseFloat(detail.width) || 0,
                height: parseFloat(detail.height) || 0,
                unit: detail.unit || '',
                material: detail.material || '',
                unitPrice: parseFloat(detail.unitPrice) || 0,
                discount: parseFloat(detail.discount) || 0,
                amount: parseFloat(detail.amount) || 0,
                perSqFt: parseFloat(detail.perSqFt) || 0,
                remarks: detail.remarks || '',
                itemDescription: detail.itemDescription || '',
                top: parseFloat(detail.top) || 0,
                bottom: parseFloat(detail.bottom) || 0,
                allowanceLeft: parseFloat(detail.allowanceLeft) || 0,
                allowanceRight: parseFloat(detail.allowanceRight) || 0,
                filename: detail.filename || '',
                squareFeet: parseFloat(squareFeet) || 0,
                printHrs: calculatedPrintHrs,  // Use the calculated value directly
                materialUsage: parseFloat(materialUsage) || 0
            };

            console.log('Submitting data:', submissionData);

            const token = localStorage.getItem('token');
            const response = await axios.post(
                'http://localhost:3000/auth/add_order_detail',
                submissionData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            
            console.log('Response from add_order_detail:', response.data); // Debug log
            
            if(response.data.Status) {
                onDetailAdded();
                setDetail({
                    quantity: 0,
                    width: 0,
                    height: 0,
                    unit: '',
                    material: '',
                    unitPrice: 0,
                    discount: 0,
                    amount: 0,
                    perSqFt: 0,
                    remarks: '',
                    itemDescription: '',
                    top: 0,
                    bottom: 0,
                    allowanceLeft: 0,
                    allowanceRight: 0,
                    filename: '',
                    squareFeet: 0,
                    materialUsage: 0,
                    printHrs: 0
                });
            } else {
                alert(response.data.Error);
            }
        } catch (err) {
            console.error('Error in handleSubmit:', err);
            alert('Failed to add order detail');
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit} className="row g-2 align-items-end">
                <div className="col-1">
                    <label className="form-label">Qty</label>
                    <input
                        type="number"
                        step="1.0"
                        className="form-control form-control-sm"
                        name="quantity"
                        value={detail.quantity}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="col-1">
                    <label className="form-label">Width</label>
                    <input
                        type="number"
                        step="1.0"
                        className="form-control form-control-sm"
                        name="width"
                        value={detail.width}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="col-1">
                    <label className="form-label">Height</label>
                    <input
                        type="number"
                        step="1.0"
                        className="form-control form-control-sm"
                        name="height"
                        value={detail.height}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="col-1">
                    <label className="form-label">Unit</label>
                    <select
                        className="form-select form-select-sm"
                        name="unit"
                        value={detail.unit || ''}
                        onChange={handleInputChange}
                    >
                        <option value="">Select</option>
                        {units.map(unit => (
                            <option key={unit.unit} value={unit.unit}>
                                {unit.unit}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col-md-2">
                    <label className="form-label">Material</label>
                    <select
                        className="form-select form-select-sm"
                        name="material"
                        value={detail.Material || detail.material || ''}
                        onChange={handleInputChange}
                    >
                        <option value="">Select Material</option>
                        {materials.map(material => (
                            <option key={material.id} value={material.Material}>
                                {material.Material}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col-md-1">
                    <label className="form-label">Per Sq Ft</label>
                    <input
                        type="number"
                        step="1.0"
                        className="form-control"
                        name="perSqFt"
                        value={detail.perSqFt}
                        onChange={handlePerSqFtChange}
                    />
                </div>
                <div className="col-1">
                    <label className="form-label">Price</label>
                    <input
                        type="number"
                        step="1.0"
                        className="form-control form-control-sm"
                        name="unitPrice"
                        value={detail.unitPrice}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="col-1">
                    <label className="form-label">Disc%</label>
                    <input
                        type="number"
                        step="1.0"
                        className="form-control form-control-sm"
                        name="discount"
                        value={detail.discount}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="col-1">
                    <label className="form-label">Amount</label>
                    <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-sm"
                        name="amount"
                        value={detail.amount}
                        readOnly
                    />
                </div>
                <div className="col-2">
                    <label className="form-label">Description</label>
                    <input
                        type="text"
                        className="form-control"
                        name="itemDescription"
                        value={detail.itemDescription}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="col-1">
                    <label className="form-label">JO Remarks</label>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        name="remarks"
                        value={detail.remarks}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="col-auto">
                    <button 
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setShowAllowanceModal(true)}
                    >
                        Allowance
                    </button>
                </div>
                <div className="col-auto">
                    <button type="submit" className="btn btn-success btn-sm">
                        Add
                    </button>
                </div>
            </form>

            {/* Custom Modal */}
            {showAllowanceModal && (
                <div className="modal d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Set Allowances</h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setShowAllowanceModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-6">
                                        <label className="form-label">Top</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            name="top"
                                            value={detail.top}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label">Bottom</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            name="bottom"
                                            value={detail.bottom}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label">Left</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            name="allowanceLeft"
                                            value={detail.allowanceLeft}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label">Right</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            name="allowanceRight"
                                            value={detail.allowanceRight}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => setShowAllowanceModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AddOrderDetails 