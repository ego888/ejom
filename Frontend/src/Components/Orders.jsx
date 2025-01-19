import axios from 'axios'
import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import debounce from 'lodash/debounce'

function Orders() {
    const [orders, setOrders] = useState([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [recordsPerPage, setRecordsPerPage] = useState(10)
    const [totalPages, setTotalPages] = useState(0)
    const [sortConfig, setSortConfig] = useState({
        key: 'id',
        direction: 'desc'
    })
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedStatuses, setSelectedStatuses] = useState([])
    const [statusOptions, setStatusOptions] = useState([])
    const [isProdChecked, setIsProdChecked] = useState(false)
    const [isAllChecked, setIsAllChecked] = useState(false)

    const fetchOrders = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get('http://localhost:3000/auth/orders', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    page: currentPage,
                    limit: recordsPerPage,
                    sortBy: sortConfig.key,
                    sortDirection: sortConfig.direction,
                    search: searchTerm,
                    statuses: selectedStatuses.length ? selectedStatuses.join(',') : undefined,
                }
            })

            if (response.data.Status) {
                setOrders(response.data.Result.orders)
                setTotalCount(response.data.Result.total)
            }
        } catch (err) {
            console.error('Error fetching orders:', err)
        } finally {
            setLoading(false)
        }
    }

    // Fetch orders when parameters change
    useEffect(() => {
        fetchOrders()
    }, [currentPage, recordsPerPage, sortConfig, searchTerm, selectedStatuses])

    // Fetch status options
    useEffect(() => {
        const fetchStatusOptions = async () => {
            try {
                const token = localStorage.getItem('token')
                const response = await axios.get('http://localhost:3000/auth/order-statuses', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (response.data.Status) {
                    const sortedStatuses = response.data.Result.sort((a, b) => a.step - b.step)
                    setStatusOptions(sortedStatuses)
                }
            } catch (err) {
                console.error('Error fetching status options:', err)
            }
        }
        fetchStatusOptions()
    }, [])

    // Debounced search handler
    const debouncedSearch = useCallback(
        debounce((term) => {
            setSearchTerm(term)
            setCurrentPage(1)
        }, 500),
        []
    )

    const handleSearch = (e) => {
        const term = e.target.value.toLowerCase()
        debouncedSearch(term)
    }

    // Sort handler
    const handleSort = (key) => {
        let direction = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
        setCurrentPage(1)
    }

    // Status filter handlers
    const handleStatusFilter = (statusId) => {
        const updatedStatuses = selectedStatuses.includes(statusId)
            ? selectedStatuses.filter(s => s !== statusId)
            : [...selectedStatuses, statusId]
        setSelectedStatuses(updatedStatuses)
        setCurrentPage(1)
    }

    // Helper function for sort indicator
    const getSortIndicator = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'asc' ? ' ↑' : ' ↓'
        }
        return ''
    }

    // Calculate pagination values
    useEffect(() => {
        setTotalPages(Math.ceil(totalCount / recordsPerPage))
    }, [totalCount, recordsPerPage])

    // Change page
    const paginate = (pageNumber) => setCurrentPage(pageNumber)

    // Handle records per page change
    const handleRecordsPerPageChange = (e) => {
        setRecordsPerPage(Number(e.target.value))
        setCurrentPage(1) // Reset to first page
    }

    const isProdIndeterminate = () => {
        const prodStatuses = statusOptions.slice(2, 6).map(s => s.statusId)
        const selectedProdStatuses = selectedStatuses.filter(s => prodStatuses.includes(s))
        return selectedProdStatuses.length > 0 && selectedProdStatuses.length < prodStatuses.length
    }

    const handleProdCheckbox = (e) => {
        const prodStatuses = statusOptions.slice(2, 6).map(s => s.statusId)
        if (e.target.checked) {
            const newStatuses = [...new Set([...selectedStatuses, ...prodStatuses])]
            setSelectedStatuses(newStatuses)
        } else {
            setSelectedStatuses(selectedStatuses.filter(s => !prodStatuses.includes(s)))
        }
        setIsProdChecked(e.target.checked)
    }

    const isAllIndeterminate = () => {
        return selectedStatuses.length > 0 && selectedStatuses.length < statusOptions.length
    }

    const handleAllCheckbox = (e) => {
        if (e.target.checked) {
            setSelectedStatuses(statusOptions.map(s => s.statusId))
            setIsProdChecked(true)
        } else {
            setSelectedStatuses([])
            setIsProdChecked(false)
        }
        setIsAllChecked(e.target.checked)
    }

    return (
        <div className='px-5 mt-3'>
            <div className='d-flex justify-content-center'>
                <h3>Orders List</h3>
            </div>
            
            {/* Search and filters row */}
            <div className='d-flex justify-content-between mb-3'>
                <Link to="/dashboard/orders/add" className='btn btn-success btn-sm'>
                    Add Order
                </Link>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search by ID, client, project, ordered by, DR#, INV#, OR#, sales, amount, ref..."
                    onChange={handleSearch}
                    style={{ width: '400px' }}
                />
            </div>

            {/* Loading indicator */}
            {loading && (
                <div className="text-center my-3">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            )}

            <div className='mt-3'>
                <table className='table table-striped table-hover'>
                    <thead>
                        <tr>
                            <th>Action</th>
                            <th onClick={() => handleSort('id')} style={{cursor: 'pointer'}}>
                                Order ID {getSortIndicator('id')}
                            </th>
                            <th onClick={() => handleSort('clientName')} style={{cursor: 'pointer'}}>
                                Client {getSortIndicator('clientName')}
                            </th>
                            <th>Project Name</th>
                            <th>Ordered By</th>
                            <th>Order Date</th>
                            <th>Due Date</th>
                            <th>Due Time</th>
                            <th onClick={() => handleSort('status')} style={{cursor: 'pointer'}}>
                                Status {getSortIndicator('status')}
                            </th>
                            <th onClick={() => handleSort('drnum')} style={{cursor: 'pointer'}}>
                                DR# {getSortIndicator('drnum')}
                            </th>
                            <th onClick={() => handleSort('invnum')} style={{cursor: 'pointer'}}>
                                INV# {getSortIndicator('invnum')}
                            </th>
                            <th>Grand Total</th>
                            <th onClick={() => handleSort('ornum')} style={{cursor: 'pointer'}}>
                                OR# {getSortIndicator('ornum')}
                            </th>
                            <th>Amount Paid</th>
                            <th>Date Paid</th>
                            <th onClick={() => handleSort('salesName')} style={{cursor: 'pointer'}}>
                                Sales {getSortIndicator('salesName')}
                            </th>
                            <th>Order Ref</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td>
                                    <div className="btn-group">
                                        <Link to={`/dashboard/view_order/${order.id}`} className='btn btn-primary btn-sm'>
                                            View
                                        </Link>
                                        <Link to={`/dashboard/orders/edit/${order.id}`} className='btn btn-info btn-sm'>
                                            Edit
                                        </Link>
                                    </div>
                                </td>
                                <td>{order.id}</td>
                                <td>{order.clientName}</td>
                                <td>{order.projectName}</td>
                                <td>{order.orderedBy}</td>
                                <td>{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : ''}</td>
                                <td>{order.dueDate ? new Date(order.dueDate).toLocaleDateString() : ''}</td>
                                <td>{order.dueTime || ''}</td>
                                <td>
                                    <span className={`badge ${
                                        order.status === 'Open' ? 'bg-success' :
                                        order.status === 'In Progress' ? 'bg-warning' :
                                        order.status === 'Completed' ? 'bg-primary' :
                                        'bg-secondary'
                                    }`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td>{order.drnum || ''}</td>
                                <td>{order.invnum || ''}</td>
                                <td>{order.grandTotal ? `₱${order.grandTotal.toLocaleString()}` : ''}</td>
                                <td>{order.ornum || ''}</td>
                                <td>{order.amountPaid ? `₱${order.amountPaid.toLocaleString()}` : ''}</td>
                                <td>{order.datePaid ? new Date(order.datePaid).toLocaleDateString() : ''}</td>
                                <td>{order.salesName}</td>
                                <td>{order.orderReference}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="d-flex justify-content-between align-items-start mt-3">
                    <div className="d-flex align-items-center gap-2">
                        <select 
                            className="form-select form-select-sm" 
                            style={{ 
                                width: 'auto',
                                fontSize: '0.75rem',
                                padding: '0.1rem 1.5rem 0.1rem 0.5rem',
                                height: 'auto'
                            }}
                            value={recordsPerPage}
                            onChange={(e) => {
                                setRecordsPerPage(Number(e.target.value))
                                setCurrentPage(1)
                            }}
                        >
                            <option value={10}>10 per page</option>
                            <option value={25}>25 per page</option>
                            <option value={50}>50 per page</option>
                            <option value={100}>100 per page</option>
                        </select>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, totalCount)} of {totalCount} entries
                        </div>
                    </div>
                    
                    {/* Status filter badges */}
                    <div className='d-flex flex-column align-items-center gap-0'>
                        {/* Status Badges */}
                        <div className='d-flex gap-1'>
                            {statusOptions.map(status => (
                                <button
                                    key={status.statusId}
                                    className={`btn btn-sm ${
                                        selectedStatuses.includes(status.statusId)
                                            ? 'btn-primary'
                                            : 'btn-outline-secondary'
                                    }`}
                                    onClick={() => handleStatusFilter(status.statusId)}
                                    style={{ 
                                        padding: '0.1rem 0.5rem',
                                        fontSize: '0.75rem'
                                    }}
                                >
                                    {status.statusId}
                                </button>
                            ))}
                        </div>

                        {/* Prod Section */}
                        <div className='position-relative w-100' style={{ padding: '0.25rem 0' }}>
                            <div className='position-absolute' style={{
                                height: '1px',
                                backgroundColor: '#ccc',
                                width: '50%',
                                left: '25%',
                                top: '50%',
                                zIndex: 0
                            }}></div>
                            <div className='d-flex justify-content-center' style={{ position: 'relative', zIndex: 1 }}>
                                <div className='d-flex align-items-center bg-white px-2'>
                                    <input
                                        type="checkbox"
                                        className="form-check-input me-1"
                                        ref={el => {
                                            if (el) {
                                                el.indeterminate = isProdIndeterminate()
                                            }
                                        }}
                                        checked={isProdChecked}
                                        onChange={handleProdCheckbox}
                                    />
                                    <label className="form-check-label">Prod</label>
                                </div>
                            </div>
                        </div>

                        {/* All Section */}
                        <div className='position-relative w-100' style={{ padding: '0rem 0' }}>
                            <div className='position-absolute' style={{
                                height: '1px',
                                backgroundColor: '#ccc',
                                width: '100%',
                                top: '50%',
                                zIndex: 0
                            }}></div>
                            <div className='d-flex justify-content-center' style={{ position: 'relative', zIndex: 1 }}>
                                <div className='d-flex align-items-center bg-white px-2'>
                                    <input
                                        type="checkbox"
                                        className="form-check-input me-1"
                                        ref={el => {
                                            if (el) {
                                                el.indeterminate = isAllIndeterminate()
                                            }
                                        }}
                                        checked={isAllChecked}
                                        onChange={handleAllCheckbox}
                                    />
                                    <label className="form-check-label">All</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <nav>
                        <ul className="pagination pagination-sm mb-0">
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                <button 
                                    className="page-link" 
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    style={{ fontSize: '0.75rem' }}
                                >
                                    First
                                </button>
                            </li>
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                <button 
                                    className="page-link" 
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    style={{ fontSize: '0.75rem' }}
                                >
                                    Previous
                                </button>
                            </li>
                            {[...Array(totalPages)].map((_, i) => (
                                <li 
                                    key={i + 1} 
                                    className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}
                                >
                                    <button 
                                        className="page-link" 
                                        onClick={() => setCurrentPage(i + 1)}
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        {i + 1}
                                    </button>
                                </li>
                            ))}
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                <button 
                                    className="page-link" 
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    style={{ fontSize: '0.75rem' }}
                                >
                                    Next
                                </button>
                            </li>
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                <button 
                                    className="page-link" 
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    style={{ fontSize: '0.75rem' }}
                                >
                                    Last
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </div>
    )
}

export default Orders 