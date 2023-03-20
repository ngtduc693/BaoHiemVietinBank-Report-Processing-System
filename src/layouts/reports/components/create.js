import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { db, addData } from "../../../utils/firebase.js";
import DataTable from "examples/Tables/DataTable";
import MDBox from "components/MDBox";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import { COLUMNS } from "./columns.js";
import {
  getCurrentDate,
  convertDateTimeStringToVnTime,
} from "../../../utils/systemUtils.js";
import { useAuthUser, useSignIn } from "react-auth-kit";
import { rolePermissionRule } from "../../authentication/sign-in/rolePermissionRule.js";
import { read, utils, writeFile } from "xlsx";
import {
  getNonDuplicateValues,
  filterAndSum,
} from "../../../utils/excelUtils.js";
import { element } from "prop-types";

function CreateDocument() {
  const [data, setData] = useState([]);
  const [summaryReportExcelFile, setSummaryReportExcelFile] = useState(null);
  const [borrowerReportExcelFile, setBorrowerReportExcelFile] = useState(null);
  const [summaryReportExcelFileName, setSummaryReportExcelFileName] =
    useState("");
  const [borrowerReportExcelFileName, setBorrowerReportExcelFileName] =
    useState("");
  const [listUnit, setListUnit] = useState([]);
  const user = useAuthUser()();

  const handleSummaryReportExcelFileChange = (event) => {
    setSummaryReportExcelFileName(event.target.files[0].name);
    setSummaryReportExcelFile(event.target.files[0]);
  };

  const handleBorrowerReportExcelFileChange = (event) => {
    setBorrowerReportExcelFileName(event.target.files[0].name);
    setBorrowerReportExcelFile(event.target.files[0]);
  };

  async function fetchData() {
    const docData = listUnit.map((current) => {
      return {
        DonVi: current,
      };
    });
    for (let unitIndex = 0; unitIndex < docData.length; unitIndex++) {
      docData[unitIndex] = {
        ...docData[unitIndex],
        Department: await (
          await getNonDuplicateValues(
            summaryReportExcelFile,
            "Tên phòng ban/PGD",
            0,
            true
          )
        ).map((element) => {
          return { Name: element, KHCN: 0, KHDN: 0 };
        }),
      };
    }

    console.log(docData);
    for (let unitIndex = 0; unitIndex < docData.length; unitIndex++) {
      for (
        let departmentIndex = 0;
        departmentIndex < docData[unitIndex].Department.length;
        departmentIndex++
      ) {
        docData[unitIndex].Department[departmentIndex]["KHCN"] =
          await filterAndSum(
            summaryReportExcelFile,
            [27, 29, 4],
            [
              docData[unitIndex].DonVi,
              docData[unitIndex].Department[departmentIndex].Name,
              "Cá nhân",
            ],
            "U"
          );
        docData[unitIndex].Department[departmentIndex]["KHDN"] =
          await filterAndSum(
            summaryReportExcelFile,
            [27, 29, 4],
            [
              docData[unitIndex].DonVi,
              docData[unitIndex].Department[departmentIndex].Name,
              "Doanh nghiệp",
            ],
            "U"
          );
      }
    }
    console.log(docData);
    await setData(
      docData.map((current) => {
        return {
          ...current,

          TepDinhKem: current.TepDinhKem ? (
            <div>
              <a href={current.TepDinhKem} target="_blank">
                Xem tệp
              </a>
            </div>
          ) : (
            ""
          ),
          HanhDong: (
            <MDBox>
              {rolePermissionRule(user.role, "DownloadData") && (
                <MDButton
                  color="success"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = current.TepDinhKem;
                    link.download = current.TepDinhKem;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  Tải về
                </MDButton>
              )}
            </MDBox>
          ),
        };
      })
    );
  }
  useEffect(() => {
    fetchData();
  }, []);
  const columns = useMemo(() => COLUMNS, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setListUnit(
      await getNonDuplicateValues(
        summaryReportExcelFile,
        "Tên đơn vị quản lý",
        0,
        true
      )
    );

    let result = "thành công";
    if (result.includes("thành công")) {
      fetchData();
      toast.success(result, {
        autoClose: 3000,
        closeOnClick: true,
        position: "bottom-right",
      });
    } else {
      toast.error(result, {
        autoClose: 3000,
        closeOnClick: true,
        position: "bottom-right",
      });
    }
  };

  return (
    <MDBox mt={3} style={{ height: "100vh" }}>
      {rolePermissionRule(user.role, "CreateDocument") && (
        <MDBox mb={3}>
          <MDBox component="form" role="form" onSubmit={handleSubmit}>
            <MDBox
              mb={2}
              display="grid"
              gridTemplateColumns="35% 35% 30%"
              style={{
                gridGap: "10px",
                paddingRight: "40px",
                boxSizing: "border-box",
              }}
            >
              <MDBox mb={2} style={{ gridColumn: "1 / span 1" }}>
                <MDBox
                  display="grid"
                  gridTemplateColumns="1fr 1fr"
                  gridgap="5px"
                >
                  <MDInput
                    type="text"
                    label="Tệp báo cáo tổng hợp"
                    fullWidth
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ readOnly: true }}
                    value={summaryReportExcelFileName}
                  />
                  <input
                    id="summaryReportExcelFile"
                    type="file"
                    onChange={handleSummaryReportExcelFileChange}
                    style={{
                      position: "absolute",
                      width: "0",
                      height: "0",
                      opacity: "0",
                      overflow: "hidden",
                    }}
                  />
                  <MDBox
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginLeft: "5px",
                    }}
                  >
                    <label
                      htmlFor="summaryReportExcelFile"
                      style={{ fontSize: "0.9rem" }}
                    >
                      Chọn tệp...
                    </label>
                  </MDBox>
                </MDBox>
              </MDBox>

              <MDBox mb={2} style={{ gridColumn: "2 / span 1" }}>
                <MDBox
                  display="grid"
                  gridTemplateColumns="1fr 1fr"
                  gridgap="5px"
                >
                  <MDInput
                    type="text"
                    label="Tệp báo cáo người vay vốn"
                    fullWidth
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ readOnly: true }}
                    value={borrowerReportExcelFileName}
                  />
                  <input
                    id="borrowerReportExcelFile"
                    type="file"
                    onChange={handleBorrowerReportExcelFileChange}
                    style={{
                      position: "absolute",
                      width: "0",
                      height: "0",
                      opacity: "0",
                      overflow: "hidden",
                    }}
                  />
                  <MDBox
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginLeft: "5px",
                    }}
                  >
                    <label
                      htmlFor="borrowerReportExcelFile"
                      style={{ fontSize: "0.9rem" }}
                    >
                      Chọn tệp...
                    </label>
                  </MDBox>
                </MDBox>
              </MDBox>

              <MDBox mb={2} style={{ gridColumn: "3 / span 1" }}>
                <MDButton
                  variant="gradient"
                  color="info"
                  type="submit"
                  fullWidth
                >
                  Tạo báo cáo nội bộ
                </MDButton>
              </MDBox>
            </MDBox>
          </MDBox>
        </MDBox>
      )}
      <MDBox mb={3}>
        <DataTable
          canSearch={true}
          table={{
            columns: COLUMNS,
            rows: data,
          }}
        />
      </MDBox>
      <ToastContainer position="bottom-right" limit={1} />
    </MDBox>
  );
}

export default CreateDocument;
