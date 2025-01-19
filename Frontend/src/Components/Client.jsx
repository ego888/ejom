import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const Client = () => {
    const [clients, setClients] = useState([])

    useEffect(() => {
        axios.get('http://localhost:3000/auth/client')
            .then(result => {
                if (result.data.Status) {
                    setClients(result.data.Result)
                }
            })
    }, [])

    const handleDelete = (id) => {
        axios.delete('http://localhost:3000/auth/delete_client/' + id)
            .then(result => {
                if (result.data.Status) {
                    window.location.reload()
                }
            })
    }

    return (
        <div className='px-5 mt-3'>
            <div className='d-flex justify-content-center'>
                <h3>Client List</h3>
            </div>
            <Link to="/dashboard/client/add" className='btn btn-success'>Add Client</Link>
            <div className='mt-3'>
                <table className='table'>
                    <thead>
                        <tr>
                            <th className="text-center">Client Name</th>
                            <th className="text-center">Contact</th>
                            <th className="text-center">Tel No</th>
                            <th className="text-center">Email</th>
                            <th className="text-center">Sales Person</th>
                            <th className="text-center">Credit Limit</th>
                            <th className="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map(client => (
                            <tr key={client.id}>
                                <td className="text-center">{client.clientName}</td>
                                <td className="text-center">{client.contact}</td>
                                <td className="text-center">{client.telNo}</td>
                                <td className="text-center">{client.email}</td>
                                <td className="text-center">{client.salesName}</td>
                                <td className="text-center">${client.creditLimit}</td>
                                <td className="text-center">
                                    <Link to={`/dashboard/client/edit/${client.id}`} className='btn btn-info btn-sm me-2'>Edit</Link>
                                    <button className='btn btn-danger btn-sm' onClick={() => handleDelete(client.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default Client 