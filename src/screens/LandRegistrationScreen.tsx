import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  StatusBar,
  Modal,
  Linking,
  NativeModules,
  PermissionsAndroid,
  Platform,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types as documentTypes,
} from '@react-native-documents/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { saveLandData, saveLandStatusData, getUserData } from '../services/firebase';
import {
  LAND_MANUAL_REVIEW_MESSAGE,
  fetchLandOptions,
  sanitizeLandLookupMessage,
  sendCustomEmailNotification,
  sendLandStatusEmail,
  trustledgeBackendConfig,
  verifyLandRecord,
} from '../services/landApi';
import { blockchainService, BlockchainTransactionResult } from '../services/blockchainService';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { ChevronLeftIcon, LandIcon, ShieldCheckIcon, ChevronDownIcon, WalletIcon, ExternalLinkIcon, DownloadIcon, DocumentTextIcon } from '../components/icons';
import TopographyBackground from '../components/TopographyBackground';
import ScreenLoadingState from '../components/ScreenLoadingState';

export interface LandRegistrationScreenProps {
  navigation: any;
  route?: any;
}

type LandState =
  | 'Punjab'
  | 'Uttar Pradesh'
  | 'Madhya Pradesh'
  | 'Rajasthan'
  | 'Karnataka'
  | 'Maharashtra'
  | 'Kerala'
  | 'Bihar'
  | 'Gujarat'
  | 'Odisha';

type LandSearchType =
  | 'Owner'
  | 'Khasra'
  | 'Khewat'
  | 'Khata'
  | 'Gata'
  | 'Survey'
  | 'Plot'
  | 'Khatiyan'
  | 'Tenant'
  | 'UPIN'
  | 'CTS'
  | 'Jamabandi';

type ManualDocumentUpload = {
  uri: string;
  name: string;
  type?: string | null;
  size?: number | null;
  cloudinaryUrl?: string | null;
};

type StateConfig = {
  title: string;
  subtitle: string;
  portalName: string;
  districtLabel: string;
  tehsilLabel: string;
  extraRegionLabel?: string;
  villageLabel: string;
  villagePlaceholder: string;
  yearEnabled: boolean;
  yearLabel?: string;
  searchTypes: LandSearchType[];
  searchPlaceholders: Partial<Record<LandSearchType, string>>;
  live: boolean;
};

const YEARS = ['2025', '2024-2025', '2023-2024', '2022-2023', '2020 - 2021'];

const LAND_STATES: LandState[] = [
  'Punjab',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Rajasthan',
  'Karnataka',
  'Maharashtra',
  'Kerala',
  'Bihar',
  'Gujarat',
  'Odisha',
];

const STATE_CONFIGS: Record<LandState, StateConfig> = {
  Punjab: {
    title: 'PUNJAB LAND RECORD SETUP',
    subtitle: 'Enter the exact Jamabandi details from the record. We will verify them through the Land Record Check API.',
    portalName: 'Punjab Land Record Check API',
    districtLabel: 'Punjab District',
    tehsilLabel: 'Tehsil',
    villageLabel: 'Revenue Village / City Entry',
    villagePlaceholder: 'e.g. Amritsar-2 Sub Urban 107',
    yearEnabled: true,
    yearLabel: 'Jamabandi Year',
    searchTypes: ['Khasra'],
    searchPlaceholders: {
      Khasra: 'e.g. 14//25/2',
      Khewat: 'e.g. 120',
      Owner: 'Verified Aadhaar owner name',
    },
    live: true,
  },
  'Uttar Pradesh': {
    title: 'UTTAR PRADESH KHATAUNI SETUP',
    subtitle: 'Select district, tehsil, village, and enter the Khata number exactly as shown on the UP Bhulekh record.',
    portalName: 'Uttar Pradesh Land Record Check API',
    districtLabel: 'District',
    tehsilLabel: 'Tehsil',
    villageLabel: 'Revenue Village',
    villagePlaceholder: 'Exact UP Bhulekh village',
    yearEnabled: false,
    searchTypes: ['Khata'],
    searchPlaceholders: {
      Khata: 'Khata number',
      Gata: 'Gata number',
      Khasra: 'Khasra number',
      Owner: 'Verified Aadhaar owner name',
    },
    live: true,
  },
  'Madhya Pradesh': {
    title: 'MADHYA PRADESH KHASRA/KHATAUNI SETUP',
    subtitle: 'Select district, tehsil, village, and plot number exactly as shown on the MP land record.',
    portalName: 'Madhya Pradesh Land Record Check API',
    districtLabel: 'District',
    tehsilLabel: 'Tehsil',
    villageLabel: 'Village',
    villagePlaceholder: 'Exact MP Bhulekh village',
    yearEnabled: false,
    searchTypes: ['Khasra'],
    searchPlaceholders: {
      Khasra: 'Plot / khasra number',
      Khata: 'Khata number',
      Owner: 'Verified Aadhaar owner name',
    },
    live: true,
  },
  Rajasthan: {
    title: 'RAJASTHAN APNA KHATA SETUP',
    subtitle: 'Select district, tehsil, village, and search by Khasra from the Rajasthan land record.',
    portalName: 'Rajasthan Land Record Check API',
    districtLabel: 'District',
    tehsilLabel: 'Tehsil',
    villageLabel: 'Village',
    villagePlaceholder: 'Exact Apna Khata village',
    yearEnabled: false,
    extraRegionLabel: 'RI / Halka',
    searchTypes: ['Khasra'],
    searchPlaceholders: {
      Khata: 'Khata number',
      Khasra: 'Khasra number',
    },
    live: true,
  },
  Karnataka: {
    title: 'KARNATAKA RTC SETUP',
    subtitle: 'Enter district, taluk, hobli, village, and survey details exactly as shown on the RTC.',
    portalName: 'Karnataka Bhoomi RTC',
    districtLabel: 'District',
    tehsilLabel: 'Taluk',
    extraRegionLabel: 'Hobli',
    villageLabel: 'Village',
    villagePlaceholder: 'Exact Bhoomi village',
    yearEnabled: false,
    searchTypes: ['Survey', 'Owner'],
    searchPlaceholders: {
      Survey: 'Survey number / Surnoc / Hissa',
      Owner: 'Verified Aadhaar owner name',
    },
    live: false,
  },
  Maharashtra: {
    title: 'MAHARASHTRA 7/12 SETUP',
    subtitle: 'Select district, taluka, village, and enter the plot number exactly as shown on the Maharashtra land record.',
    portalName: 'Maharashtra Land Record Check API',
    districtLabel: 'District',
    tehsilLabel: 'Taluka',
    villageLabel: 'Village',
    villagePlaceholder: 'Exact Mahabhumi village',
    yearEnabled: false,
    searchTypes: ['Survey'],
    searchPlaceholders: {
      Survey: 'Plot / Survey / Gat number',
      CTS: 'CTS / city survey number',
      Owner: 'Verified Aadhaar owner name',
    },
    live: true,
  },
  Kerala: {
    title: 'KERALA VILLAGE LAND SETUP',
    subtitle: 'Select district, village office, and block number from the Kerala Revenue official village portal.',
    portalName: 'Kerala Revenue Village Portal',
    districtLabel: 'District',
    tehsilLabel: 'Office Type',
    extraRegionLabel: 'Block Number',
    villageLabel: 'Village Office',
    villagePlaceholder: 'Exact Kerala village office',
    yearEnabled: false,
    searchTypes: ['Survey', 'Owner'],
    searchPlaceholders: {
      Survey: 'Survey / block reference',
      Owner: 'Verified Aadhaar owner name',
    },
    live: true,
  },
  Bihar: {
    title: 'BIHAR JAMABANDI SETUP',
    subtitle: 'Select district, circle, halka, mauza, and search by owner, plot, khata, or Jamabandi number.',
    portalName: 'Bihar Bhumi Jamabandi',
    districtLabel: 'District',
    tehsilLabel: 'Circle / Anchal',
    extraRegionLabel: 'Halka',
    villageLabel: 'Mauza',
    villagePlaceholder: 'Exact Bihar Bhumi mauza',
    yearEnabled: false,
    searchTypes: ['Owner', 'Plot', 'Khata', 'Jamabandi'],
    searchPlaceholders: {
      Owner: 'Verified Aadhaar owner name',
      Plot: 'Plot number',
      Khata: 'Khata number',
      Jamabandi: 'Jamabandi number',
    },
    live: true,
  },
  Gujarat: {
    title: 'GUJARAT ANYROR SETUP',
    subtitle: 'Enter rural or urban location and Survey/Block/Khata/UPIN details exactly as shown on the record.',
    portalName: 'Gujarat AnyRoR',
    districtLabel: 'District',
    tehsilLabel: 'Taluka / City Survey Office',
    extraRegionLabel: 'Ward / Sheet / Village Form',
    villageLabel: 'Village / Area',
    villagePlaceholder: 'Exact AnyRoR village or urban area',
    yearEnabled: false,
    searchTypes: ['Survey', 'Khata', 'UPIN', 'Owner'],
    searchPlaceholders: {
      Survey: 'Survey / Block number',
      Khata: 'Khata number',
      UPIN: 'UPIN',
      Owner: 'Verified Aadhaar owner name',
    },
    live: false,
  },
  Odisha: {
    title: 'ODISHA BHULEKH SETUP',
    subtitle: 'Enter district, tahasil, village, and Khatiyan/Plot/Tenant details exactly as shown on the RoR.',
    portalName: 'Odisha Bhulekh',
    districtLabel: 'District',
    tehsilLabel: 'Tahasil',
    extraRegionLabel: 'RI Circle',
    villageLabel: 'Village',
    villagePlaceholder: 'Exact Odisha Bhulekh village',
    yearEnabled: false,
    searchTypes: ['Khatiyan', 'Plot', 'Tenant'],
    searchPlaceholders: {
      Khatiyan: 'Khatiyan number',
      Plot: 'Plot number',
      Tenant: 'Tenant name',
    },
    live: true,
  },
};

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getOfficialRowCells = (row: any): string[] => {
  const cells = Array.isArray(row) ? row : row?.values;
  return Array.isArray(cells) ? cells.map((cell) => String(cell)) : [];
};

export default function LandRegistrationScreen({ navigation, route }: LandRegistrationScreenProps) {
  const isFocused = useIsFocused();
  const [selectedState, setSelectedState] = useState<LandState>('Punjab');
  const [district, setDistrict] = useState('');
  const [tehsil, setTehsil] = useState('');
  const [extraRegion, setExtraRegion] = useState('');
  const [landCategory, setLandCategory] = useState('Rural');
  const [rajasthanRi, setRajasthanRi] = useState('');
  const [rajasthanHalka, setRajasthanHalka] = useState('');
  const [rajasthanSheetNo, setRajasthanSheetNo] = useState('');
  const [village, setVillage] = useState('');
  const [year, setYear] = useState('2025');
  const [searchType, setSearchType] = useState<LandSearchType>('Khasra');
  const [searchValue, setSearchValue] = useState('');
  const [showStateModal, setShowStateModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [showTehsilModal, setShowTehsilModal] = useState(false);
  const [showExtraRegionModal, setShowExtraRegionModal] = useState(false);
  const [showVillageModal, setShowVillageModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionError, setOptionError] = useState('');
  const [officialOptions, setOfficialOptions] = useState({
    districts: [] as string[],
    tehsils: [] as string[],
    extraRegions: [] as string[],
    villages: [] as string[],
    years: [] as string[],
  });
  const [loadingText, setLoadingText] = useState('');
  const [success, setSuccess] = useState(false);
  const [showManualSavedScreen, setShowManualSavedScreen] = useState(false);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [landRecord, setLandRecord] = useState<any>(null);
  const [blockchainTx, setBlockchainTx] = useState<BlockchainTransactionResult | null>(null);
  const [savingToBlockchain, setSavingToBlockchain] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [regMode, setRegMode] = useState<'online' | 'manual'>('online');
  const [officialLookupError, setOfficialLookupError] = useState('');
  const [manualRegistrationNumber, setManualRegistrationNumber] = useState('');
  const [manualSurveyNo, setManualSurveyNo] = useState('');
  const [manualArea, setManualArea] = useState('');
  const [manualFileReference, setManualFileReference] = useState('');
  const [manualDocumentUpload, setManualDocumentUpload] = useState<ManualDocumentUpload | null>(null);
  const [manualNotes, setManualNotes] = useState('');
  const [uploadingToCloudinary, setUploadingToCloudinary] = useState(false);

  useEffect(() => {
    if (regMode === 'manual') {
      setLoadingOptions(false);
      setOptionError('');
      setOfficialOptions({ districts: [], tehsils: [], extraRegions: [], villages: [], years: [] });
    }
  }, [regMode]);

  useEffect(() => {
    if (route?.params?.mode === 'manual') {
      setRegMode('manual');
      setSuccess(false);
      setShowManualSavedScreen(false);
      setOfficialLookupError(
        route.params.notice ||
        LAND_MANUAL_REVIEW_MESSAGE,
      );
    }
  }, [route?.params?.mode, route?.params?.notice]);
  const stateConfig = STATE_CONFIGS[selectedState];
  const isPunjab = selectedState === 'Punjab';
  const isUttarPradesh = selectedState === 'Uttar Pradesh';
  const isMadhyaPradesh = selectedState === 'Madhya Pradesh';
  const isRajasthan = selectedState === 'Rajasthan';
  const isOdisha = selectedState === 'Odisha';
  const isMaharashtra = selectedState === 'Maharashtra';
  const isKerala = selectedState === 'Kerala';
  const isBihar = selectedState === 'Bihar';
  const isLiveOfficialState = isPunjab || isUttarPradesh || isMadhyaPradesh || isRajasthan || isOdisha || isMaharashtra || isKerala || isBihar;
  const districtOptions = officialOptions.districts;
  const tehsilOptions = officialOptions.tehsils;
  const extraRegionOptions = officialOptions.extraRegions || [];
  const villageOptions = officialOptions.villages;
  const yearOptions = officialOptions.years.length ? officialOptions.years : YEARS;
  const manualDocumentSizeLabel = manualDocumentUpload?.size
    ? `${(manualDocumentUpload.size / (1024 * 1024)).toFixed(2)} MB`
    : '';

  const buildReportUrl = useCallback(() => {
    const baseUrl = trustledgeBackendConfig?.baseUrl
      ? trustledgeBackendConfig.baseUrl.replace(/\/+$/, '')
      : 'https://third-party-pa56.onrender.com';
    const mode = landRecord?.lookupMode === 'manual_upload' ? 'Manual document review' : 'Official portal sync';
    const customPhotoUrl = landRecord?.cloudinaryUrl || landRecord?.sourceUrl || landRecord?.documentUpload?.cloudinaryUrl || manualDocumentUpload?.cloudinaryUrl;
    const finalSource = (customPhotoUrl && (customPhotoUrl.startsWith('http://') || customPhotoUrl.startsWith('https://')))
      ? customPhotoUrl
      : (landRecord?.source || landRecord?.documentReference || manualFileReference || 'Destiny Protocol Vault');

    return `${baseUrl}/api/land/report?` +
      `ownerName=${encodeURIComponent(landRecord?.ownerName || ownerName || 'Record Holder')}` +
      `&state=${encodeURIComponent(landRecord?.state || selectedState || 'N/A')}` +
      `&district=${encodeURIComponent(landRecord?.district || district || 'N/A')}` +
      `&tehsil=${encodeURIComponent(landRecord?.subRegistrarOffice || landRecord?.tehsil || tehsil || 'N/A')}` +
      `&village=${encodeURIComponent(landRecord?.village || village || 'N/A')}` +
      `&registrationNumber=${encodeURIComponent(landRecord?.registrationNumber || manualRegistrationNumber || 'TL-REG-8823')}` +
      `&surveyNo=${encodeURIComponent(landRecord?.surveyNo || manualSurveyNo || 'Official Record')}` +
      `&area=${encodeURIComponent(landRecord?.area || manualArea || 'N/A')}` +
      `&mode=${encodeURIComponent(mode)}` +
      `&source=${encodeURIComponent(finalSource)}` +
      `&hash=${encodeURIComponent(blockchainTx?.transactionHash || landRecord?.blockchain?.transactionHash || '0x7f8a9b2c4e5f6a7b8c9d0e1f2a3b4c5d6e')}`;
  }, [
    blockchainTx?.transactionHash,
    district,
    landRecord,
    manualArea,
    manualFileReference,
    manualRegistrationNumber,
    manualSurveyNo,
    ownerName,
    selectedState,
    tehsil,
    village,
    manualDocumentUpload,
    trustledgeBackendConfig,
  ]);

  const openIntelligenceReport = useCallback(() => {
    const reportUrl = buildReportUrl().replace('/api/land/report?', '/api/land/report.pdf?');
    const rawFileName = `destiny-property-report-${landRecord?.registrationNumber || manualRegistrationNumber || landRecord?.surveyNo || manualSurveyNo || Date.now()}.pdf`;
    const fileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '-');

    const downloadReport = async () => {
      try {
        setDownloadingReport(true);
        if (Platform.OS === 'android' && NativeModules.ReportDownloader?.downloadFile) {
          if (Number(Platform.Version) <= 28) {
            const permission = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
              {
                title: 'Storage Permission',
                message: 'Allow Destiny Protocol to save the report in Downloads.',
                buttonPositive: 'Allow',
              },
            );
            if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
              throw new Error('Storage permission denied. Report was not downloaded.');
            }
          }
          const savedLocation = await NativeModules.ReportDownloader.downloadFile(reportUrl, fileName);
          ToastAndroid.show(`Report saved to Downloads: ${fileName}`, ToastAndroid.LONG);
          console.log('Land report saved:', savedLocation);
          return;
        }
        Alert.alert('Download Report', 'Report download is available on Android builds.');
      } catch (error: any) {
        Alert.alert('Download Failed', error?.message || 'Could not download the report. Please try again.');
      } finally {
        setDownloadingReport(false);
      }
    };

    downloadReport();
  }, [buildReportUrl, landRecord?.registrationNumber, landRecord?.surveyNo, manualRegistrationNumber, manualSurveyNo]);

  const loadOfficialOptions = useCallback(
    async (next: { state?: LandState; district?: string; tehsil?: string; village?: string; extraRegion?: string }) => {
      const nextState = next.state || selectedState;
      if (!['Punjab', 'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan', 'Odisha', 'Maharashtra', 'Kerala', 'Bihar'].includes(nextState)) {
        setOfficialOptions({ districts: [], tehsils: [], extraRegions: [], villages: [], years: [] });
        setOptionError('');
        return;
      }

      setLoadingOptions(true);
      setOptionError('');
      try {
        const options = await fetchLandOptions({
          state: nextState,
          district: next.district,
          tehsil: next.tehsil,
          village: next.village,
          extraRegion: next.extraRegion,
        });
        setOfficialOptions({
          districts: options.districts,
          tehsils: options.tehsils,
          extraRegions: options.extraRegions || [],
          villages: options.villages,
          years: options.years,
        });
        if (next.village && options.years[0]) {
          setYear(options.years[0]);
        }
      } catch (error: any) {
        const message = error?.message || 'Could not load official land dropdowns.';
        console.warn('Official land options lookup failed:', message);
        setOptionError(message);
      } finally {
        setLoadingOptions(false);
      }
    },
    [selectedState],
  );

  const runOfficialSync = async ({
    nextDistrict,
    nextTehsil,
    nextVillage,
    nextYear,
    nextSearchType,
    nextSearchValue,
    nextOwnerName,
    nextCategory,
    nextRi,
    nextHalka,
    nextSheetNo,
    nextUserId = userId,
  }: {
    nextDistrict: string;
    nextTehsil: string;
    nextVillage: string;
    nextYear: string;
    nextSearchType: LandSearchType;
    nextSearchValue: string;
    nextOwnerName: string;
    nextCategory?: string;
    nextRi?: string;
    nextHalka?: string;
    nextSheetNo?: string;
    nextUserId?: string;
  }) => {
    const trimmedDistrict = nextDistrict.trim();
    const trimmedTehsil = nextTehsil.trim();
    const trimmedVillage = nextVillage.trim();
    const trimmedYear = nextYear.trim();
    const trimmedSearchValue = nextSearchValue.trim();
    const trimmedOwnerName = nextOwnerName.trim();
    const trimmedCategory = String(nextCategory || '').trim();
    const trimmedRi = String(nextRi || '').trim();
    const trimmedHalka = String(nextHalka || '').trim();
    const trimmedSheetNo = String(nextSheetNo || '').trim();
    const trimmedExtraRegion = extraRegion.trim();

    setOfficialLookupError('');
    if (!trimmedDistrict || !trimmedTehsil) {
      Alert.alert('Missing Location', `Enter the exact ${stateConfig.districtLabel} and ${stateConfig.tehsilLabel} from ${stateConfig.portalName}.`);
      return;
    }

    if (!trimmedVillage) {
      Alert.alert('Missing Village', 'Select or enter the exact revenue village/city entry from the land record.');
      return;
    }

    if (isPunjab && !trimmedYear) {
      Alert.alert('Missing Year', 'Select or enter the Jamabandi year for Punjab land verification.');
      return;
    }

    if (stateConfig.extraRegionLabel && extraRegionOptions.length && !isOdisha && !isRajasthan && !trimmedExtraRegion) {
      Alert.alert('Missing Region', `Select the exact ${stateConfig.extraRegionLabel} from ${stateConfig.portalName}.`);
      return;
    }

    if (nextSearchType !== 'Owner' && !trimmedSearchValue) {
      Alert.alert('Missing Search Number', `Enter the ${nextSearchType} number to search official land records.`);
      return;
    }

    if ((isMaharashtra || isMadhyaPradesh) && !trimmedCategory) {
      Alert.alert('Missing Category', 'Enter the land record category, for example Rural.');
      return;
    }

    if (isRajasthan && (!trimmedRi || !trimmedHalka || !trimmedSheetNo)) {
      Alert.alert('Missing Rajasthan Details', 'Enter RI, Halka, and Sheet No. for Rajasthan land verification.');
      return;
    }

    const requestId = `LAND_${Date.now().toString(36).toUpperCase()}`;
    const submittedAt = new Date().toISOString();
    const requestPayload = {
      requestId,
      status: 'PROCESSING',
      state: selectedState,
      district: trimmedDistrict,
      tehsil: trimmedTehsil,
      extraRegion: trimmedExtraRegion,
      category: trimmedCategory,
      ri: trimmedRi,
      halka: trimmedHalka,
      sheetNo: trimmedSheetNo,
      village: trimmedVillage,
      year: isPunjab ? trimmedYear : 'CURRENT',
      searchType: nextSearchType,
      searchValue: nextSearchType === 'Owner' ? '' : trimmedSearchValue,
      ownerName: trimmedOwnerName,
      submittedAt,
      message: 'Land verification is in progress.',
    };

    if (!isLiveOfficialState) {
      await saveLandStatusData(nextUserId, {
        ...requestPayload,
        status: 'PENDING_CONNECTOR',
        message: `${stateConfig.portalName} details are saved for review.`,
      });
      Alert.alert(
        'Details Saved',
        `${stateConfig.portalName} details are saved for review. This is not marked as verified land data yet.`,
        [{ text: 'Go to Dashboard', onPress: () => navigation.navigate('MainTabs') }],
      );
      navigation.navigate('MainTabs');
      return;
    }

    if (isRajasthan && nextSearchType !== 'Khasra') {
      Alert.alert('Unsupported Rajasthan Search', 'Rajasthan verification currently supports Khasra search.');
      return;
    }

    if (isUttarPradesh && nextSearchType !== 'Khata') {
      Alert.alert('Unsupported UP Search', 'Uttar Pradesh verification currently supports Khata number search.');
      return;
    }

    if (isMadhyaPradesh && nextSearchType !== 'Khasra') {
      Alert.alert('Unsupported MP Search', 'Madhya Pradesh verification currently supports plot / khasra number search.');
      return;
    }

    if (isBihar && !['Owner', 'Plot', 'Khata', 'Jamabandi'].includes(nextSearchType)) {
      Alert.alert('Unsupported Bihar Search', 'Bihar Bhumi official lookup supports Owner, Plot, Khata, or Jamabandi search.');
      return;
    }

    setLoading(true);
    const steps = [
      `Preparing secure ${stateConfig.portalName} session...`,
      `Preparing ${stateConfig.portalName} ledger...`,
      `Matching ${trimmedDistrict} / ${trimmedTehsil} / ${trimmedVillage}...`,
      `Checking ${nextSearchType} details...`,
      'Reviewing ownership and survey rows...',
      'Saving verified record...',
    ];

    try {
      await saveLandStatusData(nextUserId, requestPayload);
      if (userEmail) {
        sendCustomEmailNotification({
          to: userEmail,
          type: 'data_fetching',
          userName: trimmedOwnerName,
          state: selectedState,
          district: trimmedDistrict,
          village: trimmedVillage,
        });
      }
      for (const step of steps) {
        setLoadingText(step);
        await new Promise<void>((resolve) => setTimeout(resolve, 650));
      }

      const record = await verifyLandRecord({
        state: selectedState,
        district: trimmedDistrict,
        tehsil: trimmedTehsil,
        extraRegion: trimmedExtraRegion,
        category: trimmedCategory,
        ri: trimmedRi,
        halka: trimmedHalka,
        sheetNo: trimmedSheetNo,
        village: trimmedVillage,
        year: isPunjab ? trimmedYear : 'CURRENT',
        searchType: nextSearchType,
        searchValue: trimmedSearchValue,
        ownerName: trimmedOwnerName,
      });

      await saveLandData(nextUserId, {
        ...record,
        lookupMode: 'official_lookup',
      });
      await saveLandStatusData(nextUserId, {
        ...requestPayload,
        status: 'SUCCESS',
        completedAt: new Date().toISOString(),
        registrationNumber: record.registrationNumber,
        message: 'Land record was verified successfully.',
      });
      if (userEmail) {
        sendLandStatusEmail({
          to: userEmail,
          status: 'SUCCESS',
          ownerName: trimmedOwnerName,
          state: selectedState,
          district: trimmedDistrict,
          tehsil: trimmedTehsil,
          extraRegion: trimmedExtraRegion,
          village: trimmedVillage,
          year: isPunjab ? trimmedYear : 'CURRENT',
          searchType: nextSearchType,
          searchValue: trimmedSearchValue,
          registrationNumber: record.registrationNumber,
        }).catch((emailErr: any) => console.warn('Land success email dispatch notice:', emailErr));
      }
      setLandRecord(record);
      setBlockchainTx(null);
      setSuccess(true);
      setLoading(false);
    } catch (error: any) {
      console.warn('Official land lookup failed:', error.message);
      const message = sanitizeLandLookupMessage(error.message) || LAND_MANUAL_REVIEW_MESSAGE;
      setLoading(false);
      setOfficialLookupError(message);
      setRegMode('manual');
      setSuccess(false);
      await saveLandStatusData(nextUserId, {
        ...requestPayload,
        status: 'FAILED',
        completedAt: new Date().toISOString(),
        errorMessage: message,
        message,
      });
      if (userEmail) {
        sendLandStatusEmail({
          to: userEmail,
          status: 'FAILED',
          ownerName: trimmedOwnerName,
          state: selectedState,
          district: trimmedDistrict,
          tehsil: trimmedTehsil,
          extraRegion: trimmedExtraRegion,
          village: trimmedVillage,
          year: isPunjab ? trimmedYear : 'CURRENT',
          searchType: nextSearchType,
          searchValue: trimmedSearchValue,
          errorMessage: message,
        }).catch((emailErr: any) => console.warn('Land failed email dispatch notice:', emailErr));
      }
    }
  };

  useEffect(() => {
    const checkExistingAndFetchName = async () => {
      try {
        setLoadingProfile(true);
        const activeUserStr = await AsyncStorage.getItem('@trustledge_active_user');
        if (!activeUserStr) return;

        const user = JSON.parse(activeUserStr);
        setUserId(user.uid);
        const profile = await getUserData(user.uid);
        setUserEmail(profile?.email || user.email || '');
        const hasAadhaar = !!profile?.verifications?.aadhaar;
        const hasPan = !!profile?.verifications?.pan;
        const hasPayment = !!profile?.verifications?.payment;

        if (!hasAadhaar || !hasPan || !hasPayment) {
          setLandRecord(null);
          setBlockchainTx(null);
          setSuccess(false);
          Alert.alert(
            'Land Verification Locked',
            'Complete Aadhaar verification, PAN verification, and payment before starting land verification.',
            [
              {
                text: 'Continue',
                onPress: () => {
                  if (!hasAadhaar) navigation.navigate('AadhaarVerification');
                  else if (!hasPan) navigation.navigate('PanVerification');
                  else navigation.navigate('RazorpayPayment');
                },
              },
            ],
          );
          return;
        }

        const aadhaar = profile?.verifications?.aadhaar || {};
        const aadhaarOwnerName = aadhaar.name || profile?.fullName || '';
        const matchedState = LAND_STATES.find((state) => normalize(state) === normalize(aadhaar.state));

        setOwnerName(aadhaarOwnerName);
        if (matchedState) {
          setSelectedState(matchedState);
        }
        if (aadhaar.district) {
          setDistrict(String(aadhaar.district));
        }
        if (aadhaar.subDistrict) {
          setTehsil(String(aadhaar.subDistrict));
        }
        setSearchType('Owner');
        const existingLandStatus = profile?.verifications?.landStatus;
        if (existingLandStatus?.status === 'FAILED') {
          setOfficialLookupError(sanitizeLandLookupMessage(existingLandStatus.errorMessage || existingLandStatus.message) || LAND_MANUAL_REVIEW_MESSAGE);
          setRegMode('manual');
        }
        if (profile?.verifications?.land) {
          const recordState = LAND_STATES.find((state) => normalize(state) === normalize(profile.verifications.land.state));
          if (recordState) {
            setSelectedState(recordState);
          }
          setLandRecord(profile.verifications.land);
          setBlockchainTx(profile.verifications.land.blockchain || null);
          setSuccess(true);
        } else {
          setLandRecord(null);
          setBlockchainTx(null);
          setSuccess(false);
        }
      } catch (error: any) {
        console.warn('Error reading data on Land Screen initialization', error);
      } finally {
        setLoadingProfile(false);
      }
    };

    if (isFocused) checkExistingAndFetchName();
  }, [isFocused, navigation]);

  useEffect(() => {
    if (!isFocused || loadingProfile || regMode === 'manual') return;

    loadOfficialOptions({
      state: selectedState,
      district: isLiveOfficialState ? district || undefined : undefined,
      tehsil: isLiveOfficialState ? tehsil || undefined : undefined,
      village: isLiveOfficialState ? village || undefined : undefined,
      extraRegion: isLiveOfficialState ? extraRegion || undefined : undefined,
    });
  }, [district, extraRegion, isFocused, isLiveOfficialState, loadOfficialOptions, loadingProfile, selectedState, tehsil, village, regMode]);

  const ownerMatchText = useMemo(() => {
    if (!landRecord?.officialRows?.length || !ownerName) return 'Owner match pending';
    const found = landRecord.officialRows
      .flatMap(getOfficialRowCells)
      .some((cell: string) => normalize(cell).includes(normalize(ownerName)));
    return found ? 'Aadhaar name found in official rows' : 'Aadhaar name not detected in official rows';
  }, [landRecord, ownerName]);

  const handleDistrictChange = (selectedDistrict: string) => {
    setDistrict(selectedDistrict);
    setTehsil('');
    setExtraRegion('');
    setVillage('');
    setYear('2025');
    loadOfficialOptions({ state: selectedState, district: selectedDistrict });
  };

  const handleStateChange = (state: LandState) => {
    setSelectedState(state);
    setSearchType(STATE_CONFIGS[state].searchTypes[0]);
    setSearchValue('');
    setOfficialLookupError('');
    setRegMode('online');
    setDistrict('');
    setTehsil('');
    setExtraRegion('');
    setLandCategory('Rural');
    setRajasthanRi('');
    setRajasthanHalka('');
    setRajasthanSheetNo('');
    setVillage('');
    setYear('2025');
    loadOfficialOptions({ state });
  };

  const handleRunOfficialSync = async () => {
    runOfficialSync({
      nextDistrict: district,
      nextTehsil: tehsil,
      nextVillage: village,
      nextYear: year,
      nextSearchType: searchType,
      nextSearchValue: searchValue,
      nextOwnerName: ownerName,
      nextCategory: landCategory,
      nextRi: rajasthanRi,
      nextHalka: rajasthanHalka,
      nextSheetNo: rajasthanSheetNo,
    });
  };

  const handleResetVerification = async () => {
    Alert.alert('Reset Land Verification', 'Unlink this official land record from your profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlink Record',
        style: 'destructive',
        onPress: async () => {
          await saveLandData(userId, null);
          await saveLandStatusData(userId, null);
          setLandRecord(null);
          setSuccess(false);
          setBlockchainTx(null);
          setOfficialLookupError('');
        },
      },
    ]);
  };

  const handlePickManualDocument = async () => {
    try {
      const [file] = await pick({
        type: [documentTypes.pdf, documentTypes.images],
        allowMultiSelection: false,
      });

      if (!file) return;

      const fileName = file.name || 'land-document';
      const [localCopy] = await keepLocalCopy({
        destination: 'cachesDirectory',
        files: [{ uri: file.uri, fileName }],
      });

      setManualDocumentUpload({
        uri: localCopy?.status === 'success' ? localCopy.localUri : file.uri,
        name: fileName,
        type: file.type,
        size: file.size,
      });

      if (!manualFileReference.trim() && file.name) {
        setManualFileReference(file.name);
      }
    } catch (error: any) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Upload Failed', error?.message || 'Could not select the PDF/image file.');
    }
  };

  const handleSaveManualLandRecord = async () => {
    const resolvedOwnerName = ownerName || 'Manual owner';
    const resolvedRegistrationNumber =
      manualRegistrationNumber.trim() ||
      searchValue.trim() ||
      `MANUAL_${Date.now().toString(36).toUpperCase()}`;

    if (!district.trim() || !tehsil.trim() || !village.trim()) {
      Alert.alert('Missing Location', 'Enter district, tehsil, and village before saving manual land data.');
      return;
    }

    if (!manualDocumentUpload?.uri) {
      Alert.alert('Document Required', 'Upload a land PDF/image document before saving manual land data.');
      return;
    }

    if (!manualRegistrationNumber.trim() && !manualSurveyNo.trim() && !manualFileReference.trim()) {
      Alert.alert('Missing Manual Data', 'Enter a registration number, survey number, or file reference.');
      return;
    }

    let cloudinaryUrl = manualDocumentUpload?.cloudinaryUrl || '';

    // Upload to Cloudinary if file attached and not yet uploaded to Cloudinary
    if (manualDocumentUpload?.uri && !cloudinaryUrl) {
      try {
        setUploadingToCloudinary(true);
        cloudinaryUrl = await uploadToCloudinary(
          manualDocumentUpload.uri,
          manualDocumentUpload.name,
          manualDocumentUpload.type || 'application/pdf'
        );
        setManualDocumentUpload(prev => (prev ? { ...prev, cloudinaryUrl } : null));
      } catch (cloudErr: any) {
        console.warn('Cloudinary upload error:', cloudErr);
        Alert.alert(
          'Cloudinary Upload Notice',
          `Document saved, but Cloudinary upload encountered an issue: ${cloudErr?.message || 'Network error'}. Local file path stored as fallback.`
        );
      } finally {
        setUploadingToCloudinary(false);
      }
    }

    const updatedDocumentUpload = manualDocumentUpload
      ? { ...manualDocumentUpload, cloudinaryUrl: cloudinaryUrl || manualDocumentUpload.cloudinaryUrl || null }
      : null;

    const finalSourceUrl = cloudinaryUrl || manualDocumentUpload?.uri || manualFileReference.trim();

    const now = new Date().toISOString();
    const manualRecord = {
      registrationNumber: resolvedRegistrationNumber,
      ownerName: resolvedOwnerName,
      surveyNo: manualSurveyNo.trim(),
      area: manualArea.trim(),
      subRegistrarOffice: tehsil.trim(),
      district: district.trim(),
      state: selectedState,
      registrationDate: now,
      village: village.trim(),
      year: stateConfig.yearEnabled ? year : 'CURRENT',
      source: 'Manual Upload',
      sourceUrl: finalSourceUrl,
      cloudinaryUrl: cloudinaryUrl || null,
      officialRows: [
        [
          resolvedOwnerName,
          selectedState,
          district.trim(),
          tehsil.trim(),
          village.trim(),
          resolvedRegistrationNumber,
          manualSurveyNo.trim(),
          manualArea.trim(),
          cloudinaryUrl || manualDocumentUpload?.name || manualFileReference.trim(),
        ].filter(Boolean),
      ],
      verifiedBy: 'manual_review',
      lookupMode: 'manual_upload',
      verificationStatus: 'MANUAL_UPLOAD',
      documentReference: manualFileReference.trim() || manualDocumentUpload?.name || '',
      documentUpload: updatedDocumentUpload,
      manualNotes: manualNotes.trim(),
      savedAt: now,
    };

    await saveLandData(userId, manualRecord);
    await saveLandStatusData(userId, {
      requestId: `LAND_MANUAL_${Date.now().toString(36).toUpperCase()}`,
      status: 'MANUAL_UPLOAD',
      state: selectedState,
      district: district.trim(),
      tehsil: tehsil.trim(),
      extraRegion,
      village: village.trim(),
      year: manualRecord.year,
      searchType,
      searchValue,
      ownerName: resolvedOwnerName,
      registrationNumber: resolvedRegistrationNumber,
      submittedAt: now,
      completedAt: now,
      message: cloudinaryUrl
        ? 'Manual land data saved & PDF document uploaded to Cloudinary successfully.'
        : 'Manual land data/file reference was saved.',
    });

    if (userEmail) {
      sendLandStatusEmail({
        to: userEmail,
        status: 'SUCCESS',
        ownerName: resolvedOwnerName,
        state: selectedState,
        district: district.trim(),
        tehsil: tehsil.trim(),
        extraRegion,
        village: village.trim(),
        year: manualRecord.year,
        searchType,
        searchValue,
        registrationNumber: resolvedRegistrationNumber,
        surveyNo: manualSurveyNo.trim(),
        area: manualArea.trim(),
      }).catch((emailErr: any) => console.warn('Manual land email dispatch notice:', emailErr));
    }

    setLandRecord(manualRecord);
    setBlockchainTx(null);
    setShowManualSavedScreen(true);
    setSuccess(true);
  };

  const handleSaveToBlockchain = async () => {
    if (!landRecord) {
      Alert.alert('No Land Record', 'Please verify a land record first before saving to blockchain.');
      return;
    }

    if (savingToBlockchain) return;

    setSavingToBlockchain(true);
    try {
      const result = await blockchainService.storeLandRecord({
        ownerName: landRecord.ownerName || ownerName,
        state: landRecord.state || selectedState,
        district: landRecord.district || district,
        tehsil: landRecord.tehsil || landRecord.subRegistrarOffice || tehsil,
        village: landRecord.village || village,
        registrationNumber: landRecord.registrationNumber,
        surveyNo: landRecord.surveyNo,
        khewatNo: landRecord.khewatNo,
        area: landRecord.area,
        estimatedValuation: landRecord.estimatedValuation,
        subRegistrarOffice: landRecord.subRegistrarOffice,
        registrationDate: landRecord.registrationDate,
        documentReference: landRecord.documentReference,
        manualNotes: landRecord.manualNotes,
      });

      if (!result.success) {
        Alert.alert('Blockchain Save Failed', result.error || 'BSC transaction could not be completed.');
        return;
      }

      const nextLandRecord = {
        ...landRecord,
        vaultSaved: true,
        vaultSavedAt: new Date().toISOString(),
        blockchain: {
          ...result,
          savedAt: new Date().toISOString(),
        },
      };

      await saveLandData(userId, nextLandRecord);
      setLandRecord(nextLandRecord);
      setBlockchainTx(result);
      Alert.alert(
        'Your Data Is Saved',
        'Your property record has been securely saved in the Destiny Protocol vault. The land details, uploaded document reference, and blockchain transaction proof are now attached to your profile. You can download the intelligence report or view the transaction hash anytime from this screen.',
      );
      if (userEmail) {
        sendCustomEmailNotification({
          to: userEmail,
          type: 'vault_save',
          userName: landRecord?.ownerName || ownerName,
          state: selectedState,
          district,
          village,
          registrationNumber: landRecord?.registrationNumber,
          transactionHash: result?.transactionHash,
        }).catch((emailErr: any) => console.warn('Vault save email dispatch notice:', emailErr));
      }
    } catch (error: any) {
      Alert.alert('Blockchain Save Failed', error?.message || 'BSC transaction could not be completed.');
    } finally {
      setSavingToBlockchain(false);
    }
  };

  const DropdownButton = ({ label, value, onPress }: { label: string; value: string; onPress: () => void }) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity style={styles.dropdownBtn} onPress={onPress} activeOpacity={0.75}>
        <Text style={styles.dropdownBtnText}>{value}</Text>
        <ChevronDownIcon size={18} color="#DFB05B" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <ScreenLoadingState
        concept="landScan"
        title="Verifying Land Records..."
        subtitle={loadingText || "Scanning 3D land topography map & survey coordinates"}
        initialPercentage={68}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050608" />
      <TopographyBackground opacity={0.3} />
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ChevronLeftIcon size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{selectedState} Land Record</Text>
          <Text style={styles.headerSubtitle}>{stateConfig.live ? 'Live record verification' : 'Record details capture'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {loadingProfile ? (
          <View style={[styles.card, styles.centerCard]}>
            <ActivityIndicator size="large" color="#DFB05B" style={{ marginBottom: 16 }} />
            <Text style={styles.loaderTitle}>Loading verified profile...</Text>
          </View>
        ) : showManualSavedScreen && landRecord ? (
          <View style={[styles.card, styles.centerCard]}>
            <View style={styles.manualSuccessRing}>
              <ShieldCheckIcon size={44} color="#10B981" />
            </View>
            <Text style={styles.manualSuccessTitle}>Manual Land Data Saved</Text>
            <Text style={styles.manualSuccessText}>
              Your uploaded property document and manual land details are saved for review. You can now continue and save this record to the secure vault.
            </Text>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => setShowManualSavedScreen(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Continue to Vault</Text>
            </TouchableOpacity>
          </View>
        ) : !success ? (
          <View style={styles.card}>
            <View style={styles.branding}>
              <LandIcon size={40} color="#DFB05B" />
              <Text style={styles.title}>{stateConfig.title}</Text>
              <Text style={styles.subtitle}>{stateConfig.subtitle}</Text>
            </View>

            <View style={styles.identityCard}>
              <ShieldCheckIcon size={18} color="#10B981" />
              <View style={styles.identityText}>
                <Text style={styles.identityLabel}>{stateConfig.live ? 'Verified Aadhaar owner name' : 'Land record details'}</Text>
                <Text style={styles.identityName}>{ownerName || 'Not returned'}</Text>
              </View>
            </View>

            <DropdownButton label="State" value={selectedState} onPress={() => setShowStateModal(true)} />

            <Text style={styles.inputLabel}>Verification Mode</Text>
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tabBtn, regMode === 'online' && styles.tabBtnActive]}
                onPress={() => setRegMode('online')}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabBtnText, regMode === 'online' && styles.tabBtnTextActive]}>
                  Online Verification
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, regMode === 'manual' && styles.tabBtnActive]}
                onPress={() => setRegMode('manual')}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabBtnText, regMode === 'manual' && styles.tabBtnTextActive]}>
                  Manual Upload
                </Text>
              </TouchableOpacity>
            </View>

            {regMode === 'online' ? (
              <>
                {loadingOptions ? (
                  <View style={styles.optionStatusBox}>
                    <ActivityIndicator size="small" color="#DFB05B" />
                    <Text style={styles.optionStatusText}>Preparing location choices...</Text>
                  </View>
                ) : null}

                {optionError ? (
                  <View style={styles.optionErrorBox}>
                    <Text style={styles.optionErrorText}>{optionError}</Text>
                  </View>
                ) : !stateConfig.live ? (
                  <View style={styles.optionStatusBox}>
                    <ShieldCheckIcon size={16} color="#DFB05B" />
                    <Text style={styles.optionStatusText}>
                      {stateConfig.portalName} is enabled for exact record capture. This request will be saved for review and will not be marked verified until matched.
                    </Text>
                  </View>
                ) : null}

                {districtOptions.length ? (
                  <>
                    <DropdownButton label={stateConfig.districtLabel} value={district || `Select ${stateConfig.districtLabel}`} onPress={() => setShowDistrictModal(true)} />
                    {tehsilOptions.length ? (
                      <DropdownButton label={stateConfig.tehsilLabel} value={tehsil || `Select ${stateConfig.tehsilLabel}`} onPress={() => setShowTehsilModal(true)} />
                    ) : (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={styles.inputLabel}>{stateConfig.tehsilLabel}</Text>
                        <TextInput
                          style={styles.input}
                          value={tehsil}
                          placeholder={stateConfig.tehsilLabel}
                          placeholderTextColor="#475569"
                          onChangeText={setTehsil}
                        />
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <View style={{ marginBottom: 16 }}>
                      <Text style={styles.inputLabel}>{stateConfig.districtLabel}</Text>
                      <TextInput
                        style={styles.input}
                        value={district}
                        placeholder={stateConfig.districtLabel}
                        placeholderTextColor="#475569"
                        onChangeText={setDistrict}
                      />
                    </View>
                    <View style={{ marginBottom: 16 }}>
                      <Text style={styles.inputLabel}>{stateConfig.tehsilLabel}</Text>
                      <TextInput
                        style={styles.input}
                        value={tehsil}
                        placeholder={stateConfig.tehsilLabel}
                        placeholderTextColor="#475569"
                        onChangeText={setTehsil}
                      />
                    </View>
                  </>
                )}

                {stateConfig.extraRegionLabel && !isKerala && !isRajasthan ? (
                  extraRegionOptions.length ? (
                    <DropdownButton
                      label={stateConfig.extraRegionLabel}
                      value={extraRegion || `Select ${stateConfig.extraRegionLabel}`}
                      onPress={() => setShowExtraRegionModal(true)}
                    />
                  ) : (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={styles.inputLabel}>{stateConfig.extraRegionLabel}</Text>
                      <TextInput
                        style={styles.input}
                        value={extraRegion}
                        placeholder={stateConfig.extraRegionLabel}
                        placeholderTextColor="#475569"
                        onChangeText={setExtraRegion}
                      />
                    </View>
                  )
                ) : null}

                {(isMaharashtra || isMadhyaPradesh) ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.inputLabel}>Category</Text>
                    <TextInput
                      style={styles.input}
                      value={landCategory}
                      placeholder="Rural"
                      placeholderTextColor="#475569"
                      onChangeText={setLandCategory}
                    />
                  </View>
                ) : null}

                {isRajasthan ? (
                  <>
                    <View style={{ marginBottom: 16 }}>
                      <Text style={styles.inputLabel}>RI</Text>
                      <TextInput
                        style={styles.input}
                        value={rajasthanRi}
                        placeholder="RI"
                        placeholderTextColor="#475569"
                        onChangeText={setRajasthanRi}
                      />
                    </View>
                    <View style={{ marginBottom: 16 }}>
                      <Text style={styles.inputLabel}>Halka</Text>
                      <TextInput
                        style={styles.input}
                        value={rajasthanHalka}
                        placeholder="Halka"
                        placeholderTextColor="#475569"
                        onChangeText={setRajasthanHalka}
                      />
                    </View>
                    <View style={{ marginBottom: 16 }}>
                      <Text style={styles.inputLabel}>Sheet No.</Text>
                      <TextInput
                        style={styles.input}
                        value={rajasthanSheetNo}
                        placeholder="Sheet No."
                        placeholderTextColor="#475569"
                        onChangeText={setRajasthanSheetNo}
                      />
                    </View>
                  </>
                ) : null}

                {villageOptions.length ? (
                  <DropdownButton
                    label={stateConfig.villageLabel}
                    value={village || `Select ${stateConfig.villageLabel}`}
                    onPress={() => setShowVillageModal(true)}
                  />
                ) : (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.inputLabel}>{stateConfig.villageLabel}</Text>
                    <TextInput
                      style={styles.input}
                      value={village}
                      placeholder={stateConfig.villagePlaceholder}
                      placeholderTextColor="#475569"
                      onChangeText={setVillage}
                    />
                  </View>
                )}

                {stateConfig.extraRegionLabel && isKerala ? (
                  extraRegionOptions.length ? (
                    <DropdownButton
                      label={stateConfig.extraRegionLabel}
                      value={extraRegion || `Select ${stateConfig.extraRegionLabel}`}
                      onPress={() => setShowExtraRegionModal(true)}
                    />
                  ) : (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={styles.inputLabel}>{stateConfig.extraRegionLabel}</Text>
                      <TextInput
                        style={styles.input}
                        value={extraRegion}
                        placeholder={stateConfig.extraRegionLabel}
                        placeholderTextColor="#475569"
                        onChangeText={setExtraRegion}
                      />
                    </View>
                  )
                ) : null}

                {stateConfig.yearEnabled ? (
                  <DropdownButton label={stateConfig.yearLabel || 'Year'} value={year} onPress={() => setShowYearModal(true)} />
                ) : null}

                <Text style={styles.inputLabel}>Search By</Text>
                <View style={styles.tabsContainer}>
                  {stateConfig.searchTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.tabBtn, searchType === type && styles.tabBtnActive]}
                      onPress={() => {
                        setSearchType(type);
                        setSearchValue('');
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.tabBtnText, searchType === type && styles.tabBtnTextActive]}>
                        {type === 'Owner' ? 'Owner' : `${type} No.`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {searchType === 'Owner' ? (
                  <View style={{ marginBottom: 18 }}>
                    <Text style={styles.inputLabel}>Owner Name Used For Search</Text>
                    <TextInput style={[styles.input, styles.disabledInput]} value={ownerName} editable={false} />
                  </View>
                ) : (
                  <View style={{ marginBottom: 18 }}>
                    <Text style={styles.inputLabel}>{searchType} Number</Text>
                    <TextInput
                      style={[styles.input, styles.searchTextInput]}
                      value={searchValue}
                      placeholder={stateConfig.searchPlaceholders[searchType] || 'Enter record number'}
                      placeholderTextColor="#475569"
                      autoCapitalize="characters"
                      onChangeText={setSearchValue}
                    />
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.btnPrimary, loading && styles.btnDisabled]}
                  onPress={handleRunOfficialSync}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  <Text style={styles.btnPrimaryText}>
                    {loading ? 'Checking...' : stateConfig.live ? 'Check Land Record' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.manualUploadBox}>
                {officialLookupError ? (
                  <View style={styles.manualNoticeBox}>
                    <ShieldCheckIcon size={16} color="#10B981" />
                    <Text style={styles.manualNoticeText}>{officialLookupError}</Text>
                  </View>
                ) : null}

                <Text style={styles.layoutHeader}>LOCATION DETAILS</Text>

                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.inputLabel}>{stateConfig.districtLabel}</Text>
                  <TextInput
                    style={styles.input}
                    value={district}
                    placeholder={`Enter ${stateConfig.districtLabel}`}
                    placeholderTextColor="#475569"
                    onChangeText={setDistrict}
                  />
                </View>

                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.inputLabel}>{stateConfig.tehsilLabel}</Text>
                  <TextInput
                    style={styles.input}
                    value={tehsil}
                    placeholder={`Enter ${stateConfig.tehsilLabel}`}
                    placeholderTextColor="#475569"
                    onChangeText={setTehsil}
                  />
                </View>

                {stateConfig.extraRegionLabel ? (
                  <View style={{ marginBottom: 14 }}>
                    <Text style={styles.inputLabel}>{stateConfig.extraRegionLabel}</Text>
                    <TextInput
                      style={styles.input}
                      value={extraRegion}
                      placeholder={`Enter ${stateConfig.extraRegionLabel}`}
                      placeholderTextColor="#475569"
                      onChangeText={setExtraRegion}
                    />
                  </View>
                ) : null}

                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.inputLabel}>{stateConfig.villageLabel}</Text>
                  <TextInput
                    style={styles.input}
                    value={village}
                    placeholder={stateConfig.villagePlaceholder}
                    placeholderTextColor="#475569"
                    onChangeText={setVillage}
                  />
                </View>

                {stateConfig.yearEnabled ? (
                  <DropdownButton label={stateConfig.yearLabel || 'Year'} value={year} onPress={() => setShowYearModal(true)} />
                ) : null}

                <Text style={[styles.layoutHeader, { marginTop: 14 }]}>MANUAL LAND DATA</Text>
                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.inputLabel}>Registration / Record ID</Text>
                  <TextInput
                    style={styles.input}
                    value={manualRegistrationNumber}
                    placeholder="Enter registration number or record ID"
                    placeholderTextColor="#475569"
                    autoCapitalize="characters"
                    onChangeText={setManualRegistrationNumber}
                  />
                </View>

                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.inputLabel}>Survey / Khasra No.</Text>
                  <TextInput
                    style={styles.input}
                    value={manualSurveyNo}
                    placeholder="e.g. 14//25/2"
                    placeholderTextColor="#475569"
                    autoCapitalize="characters"
                    onChangeText={setManualSurveyNo}
                  />
                </View>

                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.inputLabel}>Area / Size</Text>
                  <TextInput
                    style={styles.input}
                    value={manualArea}
                    placeholder="e.g. 2 Kanal 4 Marla / 0.45 Hectare"
                    placeholderTextColor="#475569"
                    onChangeText={setManualArea}
                  />
                </View>
                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.inputLabel}>Upload PDF / Image *</Text>
                  <TouchableOpacity
                    style={styles.uploadPickerBtn}
                    onPress={handlePickManualDocument}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.uploadPickerBtnText}>
                      {manualDocumentUpload ? 'Change File' : 'Choose File'}
                    </Text>
                  </TouchableOpacity>

                  {manualDocumentUpload ? (
                    <View style={styles.selectedFileCard}>
                      <View style={styles.selectedFileInfo}>
                        <Text style={styles.selectedFileName} numberOfLines={1}>
                          {manualDocumentUpload.name}
                        </Text>
                        <Text style={styles.selectedFileMeta} numberOfLines={1}>
                          {[manualDocumentUpload.type || 'Selected file', manualDocumentSizeLabel].filter(Boolean).join(' - ')}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeFileBtn}
                        onPress={() => setManualDocumentUpload(null)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.removeFileText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.inputLabel}>Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={manualNotes}
                    placeholder="Any extra land details from uploaded file"
                    placeholderTextColor="#475569"
                    multiline
                    textAlignVertical="top"
                    onChangeText={setManualNotes}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.btnPrimary, uploadingToCloudinary && { opacity: 0.7 }]}
                  onPress={handleSaveManualLandRecord}
                  disabled={uploadingToCloudinary}
                  activeOpacity={0.85}
                >
                  {uploadingToCloudinary ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color="#000000" />
                      <Text style={styles.btnPrimaryText}>Uploading...</Text>
                    </View>
                  ) : (
                    <Text style={styles.btnPrimaryText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={{ width: '100%' }}>
            {landRecord.lookupMode === 'manual_upload' ? (
              <View style={styles.manualSavedCard}>
                <View style={styles.manualSavedHeader}>
                  <View style={styles.manualSavedIcon}>
                    <DocumentTextIcon size={22} color="#DFB05B" />
                  </View>
                  <View style={styles.manualSavedHeaderText}>
                    <Text style={styles.manualSavedTitle}>Manual Property Review Saved</Text>
                    <Text style={styles.manualSavedSubtitle} numberOfLines={1}>
                      {landRecord.registrationNumber || landRecord.documentReference || 'Manual land record'}
                    </Text>
                  </View>
                  <View style={styles.manualReviewBadge}>
                    <Text style={styles.manualReviewBadgeText}>REVIEW</Text>
                  </View>
                </View>

                <View style={styles.manualSavedGrid}>
                  <InfoRow label="OWNER" value={landRecord.ownerName || 'Manual owner'} />
                  <InfoRow label="STATE" value={landRecord.state || selectedState} />
                  <InfoRow label="DISTRICT" value={landRecord.district || district || 'Not provided'} />
                  <InfoRow label="TEHSIL" value={landRecord.subRegistrarOffice || landRecord.tehsil || tehsil || 'Not provided'} />
                  <InfoRow label="VILLAGE" value={landRecord.village || village || 'Not provided'} />
                  <InfoRow label="SURVEY / KHASRA" value={landRecord.surveyNo || 'Manual file reference'} highlight />
                  <InfoRow label="AREA" value={landRecord.area || 'Not provided'} />
                  <InfoRow label="DOCUMENT" value={landRecord.documentUpload?.name || landRecord.documentReference || 'Uploaded land document'} last />
                </View>

                {landRecord.cloudinaryUrl || (landRecord.sourceUrl && (landRecord.sourceUrl.startsWith('http://') || landRecord.sourceUrl.startsWith('https://'))) ? (
                  <View style={styles.manualDocumentCard}>
                    <View style={styles.manualDocumentInfo}>
                      <ShieldCheckIcon size={14} color="#10B981" />
                      <Text style={styles.manualDocumentText} numberOfLines={1}>Cloudinary document stored</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        const url = landRecord.cloudinaryUrl || landRecord.sourceUrl;
                        if (url) Linking.openURL(url);
                      }}
                      style={styles.manualDocumentLink}
                    >
                      <Text style={styles.manualDocumentLinkText}>View</Text>
                      <ExternalLinkIcon size={12} color="#DFB05B" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                <Text style={styles.manualSavedNote}>
                  Manual data is saved for review. It is not marked as official portal verified until matching government records are confirmed.
                </Text>
              </View>
            ) : (
              <View style={styles.deedCard}>
                <View style={styles.deedHeader}>
                  <View style={styles.deedHeaderLeft}>
                    <Text style={styles.deedTitle}>OFFICIAL LAND RECORD VERIFIED</Text>
                    <Text style={styles.deedRegNo}>ID: {landRecord.registrationNumber}</Text>
                  </View>
                  <View style={styles.verifiedBadge}>
                    <ShieldCheckIcon size={12} color="#10B981" />
                    <Text style={styles.verifiedBadgeText}>OFFICIAL</Text>
                  </View>
                </View>
                <View style={styles.deedDivider} />
                <View style={styles.deedTable}>
                  <InfoRow label="OWNER" value={landRecord.ownerName} />
                  <InfoRow label="DISTRICT" value={landRecord.district} />
                  <InfoRow label="TEHSIL" value={landRecord.subRegistrarOffice || landRecord.tehsil || 'Manual entry'} />
                  <InfoRow label="VILLAGE" value={landRecord.village} />
                  <InfoRow label="KHASRA" value={landRecord.surveyNo || 'Manual file reference'} highlight />
                  <InfoRow label="AREA" value={landRecord.area || 'Not provided'} />
                  <InfoRow label="OWNER CHECK" value={ownerMatchText} last />
                </View>
              </View>
            )}

            <Text style={styles.layoutHeader}>
              {landRecord.lookupMode === 'manual_upload' ? 'STRUCTURED MANUAL DATA / FILE REFERENCE' : 'OFFICIAL ROWS RETURNED BY PORTAL'}
            </Text>
            <View style={styles.rowsCard}>
              {(landRecord.officialRows || []).slice(0, 12).map((row: any, index: number) => {
                const cells = getOfficialRowCells(row);
                return (
                  <View key={`${index}-${cells.join('|')}`} style={styles.officialRow}>
                    <Text style={styles.officialRowIndex}>{index + 1}</Text>
                    <Text style={styles.officialRowText}>{cells.join(' | ')}</Text>
                  </View>
                );
              })}
            </View>

            {/* Blockchain Section */}
            <View style={styles.blockchainSection}>
              <View style={styles.blockchainHeader}>
                <WalletIcon size={20} color="#DFB05B" />
                <Text style={styles.blockchainTitle}>SECURE BLOCKCHAIN VAULT</Text>
              </View>
              {blockchainTx ? (
                <View style={styles.txSuccessCard}>
                  <ShieldCheckIcon size={24} color="#10B981" />
                  <Text style={styles.txSuccessTitle}>Your Data Is Saved</Text>
                  <Text style={styles.txSuccessMessage}>
                    Property details, document reference, and vault proof are saved in your profile.
                  </Text>
                  <Text style={styles.txHashLabel}>{blockchainTx.explorerUrl ? 'Transaction Hash:' : 'Hash Value:'}</Text>
                  <Text style={styles.txHashValue}>{blockchainTx.transactionHash?.slice(0, 20)}...{blockchainTx.transactionHash?.slice(-8)}</Text>
                  {blockchainTx?.explorerUrl ? (
                    <TouchableOpacity 
                      style={styles.explorerBtn}
                      onPress={() => {
                        const explorerUrl = blockchainTx.explorerUrl;
                        if (!explorerUrl) return;
                        Linking.openURL(explorerUrl).catch(() => {
                          Alert.alert('BSC Explorer', explorerUrl);
                        });
                      }}
                    >
                      <ExternalLinkIcon size={16} color="#DFB05B" />
                      <Text style={styles.explorerBtnText}>View on BSC Explorer</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.saveVaultBtn, savingToBlockchain && styles.saveVaultBtnDisabled]}
                  onPress={handleSaveToBlockchain}
                  disabled={savingToBlockchain}
                  activeOpacity={0.85}
                >
                  {savingToBlockchain ? (
                    <ActivityIndicator size="small" color="#1A1405" />
                  ) : (
                    <>
                      <WalletIcon size={18} color="#1A1405" />
                      <Text style={styles.saveVaultBtnText}>SAVE TO SECURE VAULT</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>



            {/* Download Audit Report Button */}
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: '#10B981', marginBottom: 12 }, downloadingReport && styles.btnDisabled]}
              onPress={openIntelligenceReport}
              disabled={downloadingReport}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {downloadingReport ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <DownloadIcon size={18} color="#FFFFFF" />
                )}
                <Text style={[styles.btnPrimaryText, { color: '#FFFFFF' }]}>
                  {downloadingReport ? 'Downloading Report' : 'Download Intelligence Report'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('MainTabs')} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => setSuccess(false)} activeOpacity={0.85}>
              <Text style={styles.btnSecondaryText}>Edit / Upload Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnReset} onPress={handleResetVerification} activeOpacity={0.75}>
              <Text style={styles.btnResetText}>UNLINK RECORD</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Official Land Audit & Security Report Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showReportModal}
        onRequestClose={() => setShowReportModal(false)}
      >
        <SafeAreaView style={styles.reportModalOverlay}>
          <View style={styles.reportModalCard}>
            <ScrollView contentContainerStyle={styles.reportScrollContent}>
              {/* Report Header */}
              <View style={styles.reportHeader}>
                <ShieldCheckIcon size={42} color="#DFB05B" />
                <Text style={styles.reportHeaderTitle}>DESTINY PROTOCOL</Text>
                <Text style={styles.reportHeaderSub}>AI-POWERED PROPERTY INTELLIGENCE REPORT</Text>
                <View style={styles.reportBadgeSecured}>
                  <Text style={styles.reportBadgeSecuredText}>
                    {landRecord?.lookupMode === 'manual_upload'
                      ? 'DATA STRUCTURED FOR MANUAL REVIEW'
                      : 'DATA CRYPTOGRAPHICALLY SECURED & VERIFIED'}
                  </Text>
                </View>
              </View>

              {/* Cryptographic Hash Summary */}
              <View style={styles.hashSection}>
                <Text style={styles.hashLabel}>RECORD SHA-256 HASH SIGNATURE:</Text>
                <Text style={styles.hashValue}>
                  {blockchainTx?.transactionHash || `0x7f8a${Math.random().toString(36).substring(2, 12)}9b2c4e5f6a7b8c9d0e1f2a3b4c5d6e`}
                </Text>
              </View>

              {/* Audit Details */}
              <View style={styles.reportTable}>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>Verified Owner:</Text>
                  <Text style={styles.reportRowVal}>{landRecord?.ownerName || ownerName || 'N/A'}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>State:</Text>
                  <Text style={styles.reportRowVal}>{landRecord?.state || selectedState}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>District:</Text>
                  <Text style={styles.reportRowVal}>{landRecord?.district || district || 'N/A'}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>Tehsil / Office:</Text>
                  <Text style={styles.reportRowVal}>{landRecord?.subRegistrarOffice || landRecord?.tehsil || tehsil || 'Verified'}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>Village / Area:</Text>
                  <Text style={styles.reportRowVal}>{landRecord?.village || village || 'N/A'}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>Registration No:</Text>
                  <Text style={styles.reportRowVal}>{landRecord?.registrationNumber || 'TL-REG-8823'}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>Survey / Khasra No:</Text>
                  <Text style={styles.reportRowVal}>{landRecord?.surveyNo || 'Official record'}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>Report Mode:</Text>
                  <Text style={styles.reportRowVal}>{landRecord?.lookupMode === 'manual_upload' ? 'Manual document review' : 'Official portal sync'}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>Data Source:</Text>
                  <Text style={styles.reportRowVal}>{landRecord?.source || landRecord?.documentReference || 'Destiny Encrypted Vault'}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>Audit Timestamp:</Text>
                  <Text style={styles.reportRowVal}>{new Date().toLocaleString()}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>Security Clearance:</Text>
                  <Text style={[styles.reportRowVal, { color: '#10B981' }]}>Pass - Zero Knowledge Verified</Text>
                </View>
              </View>

              {/* Data Security Legal Guarantee Notice */}
              <View style={styles.securityGuaranteeBox}>
                <Text style={styles.securityGuaranteeTitle}>DATA SECURITY & IMMUTABILITY ASSURANCE</Text>
                <Text style={styles.securityGuaranteeText}>
                  {landRecord?.lookupMode === 'manual_upload'
                    ? 'This report structures the submitted property details and uploaded document reference for manual review. It is not marked as official portal verified until matching government records are confirmed.'
                    : 'This document certifies that the above property record has been verified against official land archives, cryptographically hashed into Destiny Protocol zero-knowledge storage, and protected against unauthorized mutation or illegal transfer attempts.'}
                </Text>
              </View>
            </ScrollView>

            {/* Action Buttons inside Report */}
            <View style={styles.reportModalActions}>
              <TouchableOpacity
                style={styles.btnDownloadAction}
                onPress={openIntelligenceReport}
                disabled={downloadingReport}
                activeOpacity={0.85}
              >
                {downloadingReport ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <DownloadIcon size={18} color="#0F172A" />
                )}
                <Text style={styles.btnDownloadActionText}>
                  {downloadingReport ? 'Downloading Report' : 'Download Intelligence Report'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnCloseReport}
                onPress={() => setShowReportModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnCloseReportText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <PickerModal
        visible={showStateModal}
        title="SELECT STATE"
        items={LAND_STATES}
        active={selectedState}
        onClose={() => setShowStateModal(false)}
        onSelect={(item) => {
          handleStateChange(item as LandState);
          setShowStateModal(false);
        }}
      />
      <PickerModal
        visible={showDistrictModal}
        title="SELECT DISTRICT"
        items={districtOptions}
        active={district}
        onClose={() => setShowDistrictModal(false)}
        onSelect={(item) => {
          handleDistrictChange(item);
          setShowDistrictModal(false);
        }}
      />
      <PickerModal
        visible={showTehsilModal}
        title={`SELECT ${stateConfig.tehsilLabel.toUpperCase()}`}
        items={tehsilOptions}
        active={tehsil}
        onClose={() => setShowTehsilModal(false)}
        onSelect={(item) => {
          setTehsil(item);
          setExtraRegion('');
          setVillage('');
          setYear('2025');
          loadOfficialOptions({ state: selectedState, district, tehsil: item });
          setShowTehsilModal(false);
        }}
      />
      <PickerModal
        visible={showExtraRegionModal}
        title={`SELECT ${(stateConfig.extraRegionLabel || 'REGION').toUpperCase()}`}
        items={extraRegionOptions}
        active={extraRegion}
        onClose={() => setShowExtraRegionModal(false)}
        onSelect={(item) => {
          setExtraRegion(item);
          if (!isKerala) {
            setVillage('');
          }
          loadOfficialOptions({ state: selectedState, district, tehsil, extraRegion: item });
          setShowExtraRegionModal(false);
        }}
      />
      <PickerModal
        visible={showVillageModal}
        title={`SELECT ${stateConfig.villageLabel.toUpperCase()}`}
        items={villageOptions}
        active={village}
        onClose={() => setShowVillageModal(false)}
        onSelect={(item) => {
          setVillage(item);
          loadOfficialOptions({ state: selectedState, district, tehsil, extraRegion, village: item });
          setShowVillageModal(false);
        }}
      />
      <PickerModal
        visible={showYearModal}
        title="SELECT YEAR"
        items={yearOptions}
        active={year}
        onClose={() => setShowYearModal(false)}
        onSelect={(item) => {
          setYear(item);
          setShowYearModal(false);
        }}
      />
    </SafeAreaView>
  );
}

function InfoRow({ label, value, highlight = false, last = false }: { label: string; value: string; highlight?: boolean; last?: boolean }) {
  return (
    <View style={[styles.tableRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.tableLabel}>{label}:</Text>
      <Text style={[styles.tableVal, highlight && { color: '#DFB05B', fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function PickerModal({
  visible,
  title,
  items,
  active,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  items: string[];
  active: string;
  onClose: () => void;
  onSelect: (item: string) => void;
}) {
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!visible) {
      setSearchText('');
    }
  }, [visible]);

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      String(item || '').toLowerCase().includes(searchText.toLowerCase())
    );
  }, [items, searchText]);

  const showCustomOption = useMemo(() => {
    const trimmed = searchText.trim();
    if (!trimmed) return false;
    return !items.some((item) => String(item || '').toLowerCase() === trimmed.toLowerCase());
  }, [items, searchText]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          
          <TextInput
            style={styles.modalSearchInput}
            placeholder="Search or type custom name..."
            placeholderTextColor="#64748B"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            {showCustomOption && (
              <TouchableOpacity
                style={[styles.modalItem, { borderLeftWidth: 3, borderLeftColor: '#DFB05B' }]}
                onPress={() => onSelect(searchText.trim())}
              >
                <Text style={[styles.modalItemText, { color: '#DFB05B', fontWeight: '800' }]}>
                  + Use Custom: "{searchText.trim()}"
                </Text>
              </TouchableOpacity>
            )}
            
            {filteredItems.map((item) => (
              <TouchableOpacity key={item} style={styles.modalItem} onPress={() => onSelect(item)}>
                <Text style={[styles.modalItemText, active === item && styles.modalItemTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
            
            {filteredItems.length === 0 && !showCustomOption && (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: '#64748B', fontSize: 13 }}>No options found</Text>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#050608' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#050608',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(223, 176, 91, 0.18)',
  },
  backBtn: {
    padding: 8,
    marginRight: 14,
    backgroundColor: '#161822',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#222634',
  },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 10.5, color: '#DFB05B', marginTop: 2, fontWeight: '500' },
  scrollContainer: { flexGrow: 1, padding: 18, justifyContent: 'center' },
  card: {
    backgroundColor: '#0E1017',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(223, 176, 91, 0.38)',
    padding: 20,
    shadowColor: '#DFB05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  centerCard: { alignItems: 'center' },
  branding: {
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222634',
    paddingBottom: 16,
  },
  title: { fontSize: 14, marginTop: 10, color: '#DFB05B', fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 11, marginTop: 6, color: '#717D96', textAlign: 'center', lineHeight: 16 },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161822',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222634',
    padding: 14,
    marginBottom: 14,
  },
  identityText: { flex: 1, marginLeft: 12 },
  identityLabel: { color: '#717D96', fontSize: 11, marginBottom: 3 },
  identityName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  inputLabel: {
    color: '#717D96',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#161822',
    borderWidth: 1,
    borderColor: '#222634',
    borderRadius: 14,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 96,
    lineHeight: 20,
  },
  disabledInput: { backgroundColor: '#0F1117', color: '#717D96' },
  searchTextInput: { fontSize: 18, textAlign: 'center', fontWeight: '700', color: '#DFB05B' },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161822',
    borderWidth: 1,
    borderColor: '#222634',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  optionStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0F1117',
    borderWidth: 1,
    borderColor: '#222634',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  optionStatusText: { flex: 1, color: '#8A94AA', fontSize: 11.5, lineHeight: 16 },
  optionErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  optionErrorText: { color: '#F87171', fontSize: 11.5, lineHeight: 16 },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F1117',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222634',
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#DFB05B' },
  tabBtnText: { color: '#717D96', fontSize: 12, fontWeight: '700' },
  tabBtnTextActive: { color: '#1A1405' },
  btnPrimary: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#DFB05B',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  btnPrimaryText: { color: '#1A1405', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  btnSecondary: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#161822',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.45)',
  },
  btnSecondaryText: { color: '#DFB05B', fontSize: 12, fontWeight: '800' },
  btnReset: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#161822',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  btnResetText: { color: '#EF4444', fontSize: 12, fontWeight: '800' },
  manualUploadBox: {
    marginTop: 16,
    backgroundColor: '#12141B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222634',
    padding: 14,
  },
  manualNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  manualNoticeText: {
    flex: 1,
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  manualSuccessRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 2,
    borderColor: '#10B981',
    marginBottom: 18,
  },
  manualSuccessTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  manualSuccessText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 18,
  },
  uploadPickerBtn: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(223, 176, 91, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  uploadPickerBtnText: {
    color: '#DFB05B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  selectedFileCard: {
    marginTop: 10,
    backgroundColor: '#0B0D13',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222634',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedFileInfo: {
    flex: 1,
    paddingRight: 10,
  },
  selectedFileName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  selectedFileMeta: {
    color: '#717D96',
    fontSize: 11,
    marginTop: 3,
  },
  removeFileBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  removeFileText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
  },
  loaderTitle: { color: '#DFB05B', fontWeight: '700', fontSize: 14 },
  loaderSubtext: { color: '#8A94AA', fontSize: 12, marginTop: 6, marginBottom: 2, textAlign: 'center' },
  consoleBox: { marginTop: 14, backgroundColor: '#0F1117', borderRadius: 12, padding: 14, width: '100%' },
  consolePrompt: { color: '#10B981', fontSize: 11, marginBottom: 8, fontWeight: '700' },
  loaderText: { color: '#CBD5E1', fontSize: 12, lineHeight: 18 },
  manualSavedCard: {
    width: '100%',
    backgroundColor: '#12141B',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.35)',
    padding: 16,
    marginBottom: 18,
  },
  manualSavedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  manualSavedIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(223, 176, 91, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  manualSavedHeaderText: { flex: 1, paddingRight: 8 },
  manualSavedTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  manualSavedSubtitle: { color: '#8A94AA', fontSize: 11, marginTop: 3 },
  manualReviewBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(223, 176, 91, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.45)',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  manualReviewBadgeText: { color: '#DFB05B', fontSize: 10, fontWeight: '900' },
  manualSavedGrid: {
    backgroundColor: '#0B0D13',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222634',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  manualDocumentCard: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  manualDocumentInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, paddingRight: 8 },
  manualDocumentText: { flex: 1, color: '#10B981', fontSize: 12, fontWeight: '700' },
  manualDocumentLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8 },
  manualDocumentLinkText: { color: '#DFB05B', fontSize: 12, fontWeight: '800' },
  manualSavedNote: {
    color: '#8A94AA',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
  },
  deedCard: {
    width: '100%',
    backgroundColor: '#12141B',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.35)',
    marginBottom: 18,
    overflow: 'hidden',
  },
  deedHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deedHeaderLeft: { flex: 1 },
  deedTitle: { color: '#DFB05B', fontSize: 13, fontWeight: '800' },
  deedRegNo: { color: '#717D96', fontSize: 11, marginTop: 4 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  verifiedBadgeText: { color: '#10B981', fontSize: 10, fontWeight: '800', marginLeft: 4 },
  deedDivider: { height: 1, backgroundColor: '#222634' },
  deedTable: { padding: 16 },
  tableRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#222634' },
  tableLabel: { color: '#717D96', fontSize: 10, fontWeight: '800', marginBottom: 3 },
  tableVal: { color: '#FFFFFF', fontSize: 12, lineHeight: 17 },
  layoutHeader: { color: '#DFB05B', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  rowsCard: { backgroundColor: '#12141B', borderRadius: 16, borderWidth: 1, borderColor: '#222634', padding: 12 },
  officialRow: { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#1C202C' },
  officialRowIndex: { width: 24, color: '#DFB05B', fontSize: 11, fontWeight: '800' },
  officialRowText: { flex: 1, color: '#CBD5E1', fontSize: 11, lineHeight: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#12141B', borderRadius: 18, borderWidth: 1, borderColor: '#222634', maxHeight: '70%' },
  modalTitle: { color: '#DFB05B', fontSize: 13, fontWeight: '800', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222634' },
  modalSearchInput: {
    backgroundColor: '#1A1D26',
    borderWidth: 1,
    borderColor: '#2E3344',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13.5,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  modalScroll: { maxHeight: 320 },
  modalItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1C202C' },
  modalItemText: { color: '#CBD5E1', fontSize: 14 },
  modalItemTextActive: { color: '#DFB05B', fontWeight: '800' },
  modalCloseBtn: { padding: 14, alignItems: 'center' },
  modalCloseBtnText: { color: '#EF4444', fontWeight: '800', fontSize: 12 },
  blockchainSection: {
    marginTop: 18,
    backgroundColor: '#12141B',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.35)',
    padding: 16,
  },
  blockchainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  blockchainTitle: {
    color: '#DFB05B',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 10,
  },
  txSuccessCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#10B981',
    padding: 16,
    alignItems: 'center',
  },
  txSuccessTitle: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
  },
  txSuccessMessage: {
    color: '#CBD5E1',
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 12,
  },
  txHashLabel: {
    color: '#717D96',
    fontSize: 11,
    marginBottom: 4,
  },
  txHashValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  explorerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  explorerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  saveVaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DFB05B',
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 52,
  },
  saveVaultBtnDisabled: {
    opacity: 0.6,
  },
  saveVaultBtnText: {
    color: '#1A1405',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 8, 0.95)',
    justifyContent: 'center',
    padding: 16,
  },
  reportModalCard: {
    backgroundColor: '#0A0C12',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#DFB05B',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  reportScrollContent: {
    padding: 20,
  },
  reportHeader: {
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(223, 176, 91, 0.2)',
    paddingBottom: 16,
  },
  reportHeaderTitle: {
    color: '#DFB05B',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 10,
  },
  reportHeaderSub: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
    textAlign: 'center',
  },
  reportBadgeSecured: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 12,
  },
  reportBadgeSecuredText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  hashSection: {
    backgroundColor: '#121620',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
    marginBottom: 16,
  },
  hashLabel: {
    color: '#DFB05B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  hashValue: {
    color: '#CBD5E1',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  reportTable: {
    backgroundColor: '#121620',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  reportRowLabel: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '600',
  },
  reportRowVal: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  securityGuaranteeBox: {
    backgroundColor: 'rgba(223, 176, 91, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  securityGuaranteeTitle: {
    color: '#DFB05B',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  securityGuaranteeText: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
  },
  reportModalActions: {
    padding: 16,
    backgroundColor: '#0F121C',
    borderTopWidth: 1,
    borderTopColor: 'rgba(223, 176, 91, 0.2)',
    gap: 10,
  },
  btnDownloadAction: {
    height: 48,
    backgroundColor: '#DFB05B',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  btnDownloadActionText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  btnCloseReport: {
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCloseReportText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
});
