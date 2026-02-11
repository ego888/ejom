import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "../utils/axiosConfig";
import { ServerIP } from "../config";
import Button from "./UI/Button";
import ModalAlert from "./UI/ModalAlert";

const EditControl = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [control, setControl] = useState({
    companyName: "",
    companyAddress1: "",
    companyAddress2: "",
    companyPhone: "",
    companyEmail: "",
    soaName: "",
    vatPercent: "",
    quoteDelivery: "",
    quoteApproval: "",
    bankInfo: "",
    salesIncentive: "",
    overrideIncentive: "",
    HalfIncentiveSqFt: "",
    ArtistMaxPercent: "",
    major: "",
    minor: "",
    ArtistMinAmount: "",
  });
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "alert",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    try {
      const decoded = jwtDecode(token);
      if (decoded.categoryId !== 1) {
        navigate("/dashboard");
        return;
      }
    } catch (error) {
      navigate("/");
      return;
    }

    const fetchControl = async () => {
      try {
        const result = await axios.get(`${ServerIP}/auth/jomcontrol`);
        if (!result.data.Status || !result.data.Result) {
          throw new Error(result.data.Error || "Failed to fetch control data");
        }

        const source = result.data.Result;
        setControl({
          companyName: source.companyName ?? "",
          companyAddress1: source.companyAddress1 ?? "",
          companyAddress2: source.companyAddress2 ?? "",
          companyPhone: source.companyPhone ?? "",
          companyEmail: source.companyEmail ?? "",
          soaName: source.soaName ?? "",
          vatPercent: source.vatPercent ?? "",
          quoteDelivery: source.quoteDelivery ?? "",
          quoteApproval: source.quoteApproval ?? "",
          bankInfo: source.bankInfo ?? "",
          salesIncentive: source.salesIncentive ?? "",
          overrideIncentive: source.overrideIncentive ?? "",
          HalfIncentiveSqFt: source.HalfIncentiveSqFt ?? "",
          ArtistMaxPercent: source.ArtistMaxPercent ?? "",
          major: source.major ?? "",
          minor: source.minor ?? "",
          ArtistMinAmount: source.ArtistMinAmount ?? "",
        });
      } catch (error) {
        setAlert({
          show: true,
          title: "Error",
          message: "Failed to load JOM control settings.",
          type: "alert",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchControl();
  }, [navigate]);

  const handleChange = (field, value) => {
    setControl((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toNumber = (value) => {
    if (value === "" || value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!control.quoteDelivery?.trim() || !control.quoteApproval?.trim()) {
      setAlert({
        show: true,
        title: "Validation Error",
        message: "Quote Delivery and Quote Approval are required.",
        type: "alert",
      });
      return;
    }

    const payload = {
      companyName: control.companyName,
      companyAddress1: control.companyAddress1,
      companyAddress2: control.companyAddress2,
      companyPhone: control.companyPhone,
      companyEmail: control.companyEmail,
      soaName: control.soaName,
      vatPercent: toNumber(control.vatPercent),
      quoteDelivery: control.quoteDelivery,
      quoteApproval: control.quoteApproval,
      bankInfo: control.bankInfo,
      salesIncentive: toNumber(control.salesIncentive),
      overrideIncentive: toNumber(control.overrideIncentive),
      HalfIncentiveSqFt: toNumber(control.HalfIncentiveSqFt),
      ArtistMaxPercent: toNumber(control.ArtistMaxPercent),
      major: Math.trunc(toNumber(control.major)),
      minor: Math.trunc(toNumber(control.minor)),
      ArtistMinAmount: toNumber(control.ArtistMinAmount),
    };

    try {
      const result = await axios.put(`${ServerIP}/auth/jomcontrol/edit`, payload);
      if (!result.data.Status) {
        throw new Error(result.data.Error || "Failed to update control settings");
      }

      setAlert({
        show: true,
        title: "Success",
        message: "JOM control settings updated successfully.",
        type: "alert",
      });
    } catch (error) {
      setAlert({
        show: true,
        title: "Error",
        message: "Failed to update JOM control settings.",
        type: "alert",
      });
    }
  };

  if (loading) {
    return <div className="px-5 mt-5">Loading...</div>;
  }

  return (
    <div className="d-flex justify-content-center align-items-center mt-3 mb-4">
      <div className="p-3 rounded w-75 border">
        <h3 className="text-center">Edit JOM Control</h3>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="companyName">Company Name</label>
                <input
                  id="companyName"
                  type="text"
                  className="form-control"
                  value={control.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="companyAddress1">Company Address 1</label>
                <input
                  id="companyAddress1"
                  type="text"
                  className="form-control"
                  value={control.companyAddress1}
                  onChange={(e) =>
                    handleChange("companyAddress1", e.target.value)
                  }
                />
              </div>
              <div className="mb-3">
                <label htmlFor="companyAddress2">Company Address 2</label>
                <input
                  id="companyAddress2"
                  type="text"
                  className="form-control"
                  value={control.companyAddress2}
                  onChange={(e) =>
                    handleChange("companyAddress2", e.target.value)
                  }
                />
              </div>
              <hr />
              <div className="mb-3">
                <label htmlFor="soaName">SOA Name</label>
                <input
                  id="soaName"
                  type="text"
                  className="form-control"
                  value={control.soaName}
                  onChange={(e) => handleChange("soaName", e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="bankInfo">Bank Info</label>
                <input
                  id="bankInfo"
                  type="text"
                  className="form-control"
                  value={control.bankInfo}
                  onChange={(e) => handleChange("bankInfo", e.target.value)}
                />
              </div>
              <hr />
              <div className="mb-3">
                <label htmlFor="salesIncentive">Sales Incentive</label>
                <input
                  id="salesIncentive"
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={control.salesIncentive}
                  onChange={(e) =>
                    handleChange("salesIncentive", e.target.value)
                  }
                />
              </div>
              <div className="mb-3">
                <label htmlFor="artistMinAmount">Artist Min Amount</label>
                <input
                  id="artistMinAmount"
                  type="number"
                  step="1"
                  className="form-control"
                  value={control.ArtistMinAmount}
                  onChange={(e) =>
                    handleChange("ArtistMinAmount", e.target.value)
                  }
                />
              </div>
              <div className="mb-3">
                <label htmlFor="major">Major</label>
                <input
                  id="major"
                  type="number"
                  step="1"
                  className="form-control"
                  value={control.major}
                  onChange={(e) => handleChange("major", e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="halfIncentiveSqFt">Half Incentive Sq Ft</label>
                <input
                  id="halfIncentiveSqFt"
                  type="number"
                  step="1"
                  className="form-control"
                  value={control.HalfIncentiveSqFt}
                  onChange={(e) =>
                    handleChange("HalfIncentiveSqFt", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="companyPhone">Company Phone</label>
                <input
                  id="companyPhone"
                  type="text"
                  className="form-control"
                  value={control.companyPhone}
                  onChange={(e) => handleChange("companyPhone", e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="companyEmail">Company Email</label>
                <input
                  id="companyEmail"
                  type="text"
                  className="form-control"
                  value={control.companyEmail}
                  onChange={(e) => handleChange("companyEmail", e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="vatPercent">VAT Percent</label>
                <input
                  id="vatPercent"
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={control.vatPercent}
                  onChange={(e) => handleChange("vatPercent", e.target.value)}
                />
              </div>
              <hr />
              <div className="mb-3">
                <label htmlFor="quoteApproval">Quote Approval</label>
                <input
                  id="quoteApproval"
                  type="text"
                  className="form-control"
                  value={control.quoteApproval}
                  onChange={(e) => handleChange("quoteApproval", e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="quoteDelivery">Quote Delivery</label>
                <input
                  id="quoteDelivery"
                  type="text"
                  className="form-control"
                  value={control.quoteDelivery}
                  onChange={(e) => handleChange("quoteDelivery", e.target.value)}
                  required
                />
              </div>
              <hr />
              <div className="mb-3">
                <label htmlFor="overrideIncentive">Override Incentive</label>
                <input
                  id="overrideIncentive"
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={control.overrideIncentive}
                  onChange={(e) =>
                    handleChange("overrideIncentive", e.target.value)
                  }
                />
              </div>
              <div className="mb-3">
                <label htmlFor="artistMaxPercent">Artist Max Percent</label>
                <input
                  id="artistMaxPercent"
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={control.ArtistMaxPercent}
                  onChange={(e) =>
                    handleChange("ArtistMaxPercent", e.target.value)
                  }
                />
              </div>
              <div className="mb-3">
                <label htmlFor="minor">Minor</label>
                <input
                  id="minor"
                  type="number"
                  step="1"
                  className="form-control"
                  value={control.minor}
                  onChange={(e) => handleChange("minor", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <Button
              variant="cancel"
              type="button"
              onClick={() => navigate("/dashboard/category")}
            >
              Cancel
            </Button>
            <Button variant="save" type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {alert.show && (
        <ModalAlert
          show={alert.show}
          title={alert.title}
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert((prev) => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
};

export default EditControl;
