// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract LandRegistry {
    struct LandRecord {
        uint256 id;
        string ownerName;
        string state;
        string district;
        string tehsil;
        string village;
        string registrationNumber;
        address owner;
        uint256 timestamp;
    }

    mapping(uint256 => LandRecord) public landRecords;
    mapping(address => uint256[]) public ownerLandRecords;
    uint256 public recordCount;
    
    event LandRecordStored(
        uint256 indexed recordId,
        address indexed owner,
        string ownerName,
        string state,
        string district,
        string tehsil,
        string village,
        string registrationNumber,
        uint256 timestamp
    );

    function storeLandRecord(
        string memory _ownerName,
        string memory _state,
        string memory _district,
        string memory _tehsil,
        string memory _village,
        string memory _registrationNumber
    ) public returns (uint256) {
        uint256 recordId = ++recordCount;
        
        LandRecord storage newRecord = landRecords[recordId];
        newRecord.id = recordId;
        newRecord.ownerName = _ownerName;
        newRecord.state = _state;
        newRecord.district = _district;
        newRecord.tehsil = _tehsil;
        newRecord.village = _village;
        newRecord.registrationNumber = _registrationNumber;
        newRecord.owner = msg.sender;
        newRecord.timestamp = block.timestamp;
        
        ownerLandRecords[msg.sender].push(recordId);
        
        emit LandRecordStored(
            recordId,
            msg.sender,
            _ownerName,
            _state,
            _district,
            _tehsil,
            _village,
            _registrationNumber,
            block.timestamp
        );
        
        return recordId;
    }

    function getLandRecord(uint256 _recordId) public view returns (LandRecord memory) {
        return landRecords[_recordId];
    }

    function getOwnerLandRecords(address _owner) public view returns (uint256[] memory) {
        return ownerLandRecords[_owner];
    }

    function getRecordCount() public view returns (uint256) {
        return recordCount;
    }
}
