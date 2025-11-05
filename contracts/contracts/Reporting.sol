// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Reporting
 * @notice Stores AI-generated report anchors on-chain
 */
contract Reporting is AccessControl {
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");

    enum ReportType {
        Summary,
        Anomaly,
        MilestoneProgress,
        FundingStatus
    }

    struct Report {
        uint256 id;
        uint256 projectId;
        ReportType reportType;
        string reportHash; // IPFS hash or short summary hash
        string summary; // Short on-chain summary (max 256 chars)
        uint256 timestamp;
        address reporter;
        bool exists;
    }

    uint256 private _reportCounter;
    mapping(uint256 => Report) public reports;
    mapping(uint256 => uint256[]) public projectReports; // projectId => reportIds

    event ReportAnchored(
        uint256 indexed reportId,
        uint256 indexed projectId,
        ReportType reportType,
        string reportHash,
        string summary,
        uint256 timestamp,
        address reporter
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REPORTER_ROLE, msg.sender);
    }

    /**
     * @notice Anchor a report on-chain
     * @param projectId Project ID
     * @param reportType Type of report
     * @param reportHash IPFS hash or content hash
     * @param summary Short on-chain summary (max 256 chars)
     */
    function anchorReport(
        uint256 projectId,
        ReportType reportType,
        string calldata reportHash,
        string calldata summary
    ) external onlyRole(REPORTER_ROLE) returns (uint256) {
        require(bytes(reportHash).length > 0, "Reporting: empty hash");
        require(bytes(summary).length <= 256, "Reporting: summary too long");

        uint256 reportId = ++_reportCounter;

        reports[reportId] = Report({
            id: reportId,
            projectId: projectId,
            reportType: reportType,
            reportHash: reportHash,
            summary: summary,
            timestamp: block.timestamp,
            reporter: msg.sender,
            exists: true
        });

        projectReports[projectId].push(reportId);

        emit ReportAnchored(
            reportId,
            projectId,
            reportType,
            reportHash,
            summary,
            block.timestamp,
            msg.sender
        );

        return reportId;
    }

    /**
     * @notice Get report details
     * @param reportId Report ID
     */
    function getReport(uint256 reportId) external view returns (Report memory) {
        require(reports[reportId].exists, "Reporting: report not found");
        return reports[reportId];
    }

    /**
     * @notice Get all reports for a project
     * @param projectId Project ID
     */
    function getProjectReports(uint256 projectId) external view returns (uint256[] memory) {
        return projectReports[projectId];
    }

    /**
     * @notice Get report count for project
     * @param projectId Project ID
     */
    function getProjectReportCount(uint256 projectId) external view returns (uint256) {
        return projectReports[projectId].length;
    }

    /**
     * @notice Get latest report for project
     * @param projectId Project ID
     */
    function getLatestReport(uint256 projectId) external view returns (Report memory) {
        uint256[] memory reportIds = projectReports[projectId];
        require(reportIds.length > 0, "Reporting: no reports");
        return reports[reportIds[reportIds.length - 1]];
    }
}
