pragma solidity ^0.8.0;

contract AuditContract {
    struct AuditReport {
        uint projectId;
        string report;
        uint timestamp;
        address auditor;
    }

    AuditReport[] public auditReports;

    function submitReport(uint projectId, string memory report) public {
        auditReports.push(AuditReport(projectId, report, block.timestamp, msg.sender));
    }

    function getAuditReports(uint projectId) public view returns (AuditReport[] memory) {
        AuditReport[] memory reports = new AuditReport[](auditReports.length);
        uint count = 0;
        for (uint i = 0; i < auditReports.length; i++) {
            if (auditReports[i].projectId == projectId) {
                reports[count] = auditReports[i];
                count++;
            }
        }
        return reports;
    }
}
