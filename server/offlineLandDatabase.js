const landDatabase = {
  "Rajasthan": {
    districts: ["Jaipur", "Jodhpur", "Udaipur", "Bikaner", "Ajmer", "Karauli", "Alwar", "Kota", "Sikar"],
    tehsils: {
      "Jaipur": ["Jaipur", "Sanganer", "Amer", "Chomu", "Bassi", "Kotputli"],
      "Jodhpur": ["Jodhpur City", "Luni", "Shergarh", "Osian", "Bilara"],
      "Udaipur": ["Udaipur Sadar", "Girwa", "Salumber", "Mavli", "Vallabhnagar"],
      "Bikaner": ["Bikaner Sadar", "Nokha", "Lunkaransar", "Sridungargarh", "Khajuwala"],
      "Ajmer": ["Ajmer Sadar", "Beawar", "Kishangarh", "Nasirabad", "Kekri"],
      "Karauli": ["Karauli", "Hindaun", "Todabhim", "Sapotra", "Mandrail"],
      "Alwar": ["Alwar Sadar", "Ramgarh", "Behror", "Tijara", "Rajgarh"],
      "Kota": ["Kota Sadar", "Ladpura", "Sangod", "Ramganj Mandi", "Pipalda"],
      "Sikar": ["Sikar Sadar", "Laxmangarh", "Fatehpur", "Neem Ka Thana", "Sri Madhopur"]
    },
    villages: {
      // Jaipur Tehsils
      "Jaipur": ["Kanakpura", "Bhankrota", "Mansarovar", "Jagatpura", "Sitapura"],
      "Sanganer": ["Sanganer Village", "Watika", "Muhana", "Goner", "Asawala"],
      "Amer": ["Amer Rural", "Kookas", "Chandwaji", "Achrol", "Bilochi"],
      "Chomu": ["Chomu Town", "Kaladera", "Morija", "Govindgarh", "Samod"],
      "Bassi": ["Bassi Rural", "Jhar", "Toonga", "Banskho"],
      "Kotputli": ["Kotputli Town", "Paniyala", "Putli", "Keshwana"],
      // Jodhpur Tehsils
      "Jodhpur City": ["Mandore", "Shastri Nagar", "Bhagat Ki Kothi", "Banar", "Salawas"],
      "Luni": ["Luni Village", "Jhitani", "Kankani", "Dhudhara", "Satlana"],
      "Shergarh": ["Shergarh Town", "Solankiyatala", "Sai", "Chaba"],
      "Osian": ["Osian Town", "Tiwri", "Mathania", "Cherai"],
      "Bilara": ["Bilara Town", "Piparcity", "Khejarli", "Bhavad"],
      // Udaipur Tehsils
      "Udaipur Sadar": ["Udaipur Rural", "Bhuwana", "Sobhagpura", "Hiran Magri"],
      "Girwa": ["Girwa Town", "Sisarma", "Kharwa", "Balicha"],
      "Salumber": ["Salumber Town", "Jaisamand", "Gingla", "Chawand"],
      "Mavli": ["Mavli Town", "Fatehnagar", "Ghasar", "Khemli"],
      "Vallabhnagar": ["Vallabhnagar Town", "Bhindar", "Kanor", "Kheroda"],
      // Bikaner Tehsils
      "Bikaner Sadar": ["Bichhwal", "Udasar", "Gangashahar", "Napasar"],
      "Nokha": ["Nokha Town", "Jasrasar", "Kakku", "Panchu"],
      "Lunkaransar": ["Lunkaransar Rural", "Kalu", "Mahajan", "Dheerera"],
      "Sridungargarh": ["Sridungargarh Town", "Sudsar", "Momasar", "Lakhasar"],
      "Khajuwala": ["Khajuwala Town", "2 KD", "5 BJD", "8 KYD"],
      // Ajmer Tehsils
      "Ajmer Sadar": ["Pushkar", "Gegal", "Palra", "Dorai"],
      "Beawar": ["Beawar Rural", "Sendra", "Jawaja", "Masuda"],
      "Kishangarh": ["Madanganj", "Harmara", "Rupangarh", "Arain"],
      "Nasirabad": ["Nasirabad Cantt", "Dilwara", "Srinagar", "Ramsar"],
      "Kekri": ["Kekri Town", "Sarwar", "Sawade", "Baghera"],
      // Karauli Tehsils
      "Karauli": ["Bada Bazar", "Ward No-14", "Post Office Karauli", "Kailadevi", "Chainpur"],
      "Hindaun": ["Hindaun Rural", "Keshopura", "Kotri", "Suroth", "Patonda"],
      "Todabhim": ["Todabhim Town", "Bhopur", "Ghatra", "Padampura", "Balaji"],
      "Sapotra": ["Sapotra Town", "Karanpur", "Naroli", "Jeetpur"],
      "Mandrail": ["Mandrail Town", "Karanpur Border", "Lahar", "Rond"],
      // Alwar Tehsils
      "Alwar Sadar": ["MIA Alwar", "Ramgarh Road", "Vijay Mandir", "Itarana"],
      "Ramgarh": ["Ramgarh Town", "Govindgarh Village", "Naugaon", "Mubarikpur"],
      "Behror": ["Behror Town", "Neemrana Outer", "Sotanala", "Jakhrana"],
      "Tijara": ["Bhiwadi", "Tijara Town", "Tapukara", "Khushkera"],
      "Rajgarh": ["Rajgarh Town", "Bandikui Outer", "Tehla", "Pinan"],
      // Kota Tehsils
      "Kota Sadar": ["Kota Industrial Area", "Kunhari", "Nayapura", "Mahaveer Nagar"],
      "Ladpura": ["Ladpura Village", "Kaithoon", "Dhakarkheri", "Sogariya"],
      "Sangod": ["Sangod Town", "Bapawar", "Kanwas", "Khushalpura"],
      "Ramganj Mandi": ["Ramganj Town", "Modak", "Sukhet", "Chechat"],
      "Pipalda": ["Pipalda Town", "Itawa", "Khatoli", "Ayana"],
      // Sikar Tehsils
      "Sikar Sadar": ["Sikar Rural", "Piprali", "Katrathal", "Harsh"],
      "Laxmangarh": ["Laxmangarh Town", "Balaran", "Nechwa", "Khood"],
      "Fatehpur": ["Fatehpur Town", "Ramgarh Shekhawati", "Dhanuri", "Tajsar"],
      "Neem Ka Thana": ["Neem Ka Thana Town", "Patan Sikar", "Sirohi Sikar", "Guwala"],
      "Sri Madhopur": ["Sri Madhopur Town", "Reengus", "Ajeetgarh", "Mau"]
    }
  },
  "Odisha": {
    districts: ["Khurda", "Cuttack", "Ganjam", "Puri", "Balasore", "Sambalpur", "Bhadrak"],
    tehsils: {
      "Khurda": ["Bhubaneswar", "Jatni", "Khurda Town", "Begunia", "Banapur"],
      "Cuttack": ["Cuttack Sadar", "Athagarh", "Salepur", "Tangi", "Baramba"],
      "Ganjam": ["Berhampur", "Chhatrapur", "Hinjilicut", "Bhanjanagar", "Aska"],
      "Puri": ["Puri Sadar", "Pipili", "Kanas", "Satyabadi", "Brahmagiri"],
      "Balasore": ["Balasore Sadar", "Basta", "Jaleswar", "Soro", "Nilgiri"],
      "Sambalpur": ["Sambalpur Town", "Hirakud", "Burla", "Rengali", "Kuchinda"],
      "Bhadrak": ["Bhadrak Town", "Dhamnagar", "Basudevpur", "Chandbali", "Tihidi"]
    },
    villages: {
      // Khurda Tehsils
      "Bhubaneswar": ["Patia", "Jayadev Vihar", "Nayapalli", "Chandrasekharpur", "Saheed Nagar"],
      "Jatni": ["Retang", "Khurda Road", "Jatni Bazar", "Kantabada", "Harirajpur"],
      "Khurda Town": ["Palla", "Gurujanga", "Thenga", "Kharavela Nagar", "Jankia"],
      "Begunia": ["Begunia Town", "Bolagarh", "Kalapatha", "Pichukuli"],
      "Banapur": ["Banapur Bazar", "Balugaon", "Chilika Border", "Bhaleri"],
      // Cuttack Tehsils
      "Cuttack Sadar": ["Chauliaganj", "Bidyadharpur", "Jobra", "Markat Nagar", "Cuttack Outer"],
      "Athagarh": ["Athagarh Town", "Radhadamodarpur", "Dorada", "Ghantikhal", "Kakhadi"],
      "Salepur": ["Salepur Bazar", "Bahugram", "Kuanpal", "Raisunguda", "Khentalo"],
      "Tangi": ["Tangi Bazar", "Chhatia", "Kotsahi", "Safipur"],
      "Baramba": ["Baramba Town", "Maniabandha", "Gopinathpur", "Kharod"],
      // Ganjam Tehsils
      "Berhampur": ["Berhampur Town", "Gopalpur", "Haldiapadar", "Lathi"],
      "Chhatrapur": ["Chhatrapur Sadar", "Aryapalli", "Agastinuagam", "Kanamana"],
      "Hinjilicut": ["Hinjili Town", "Pochilima", "Kanchuru", "Bhatapada"],
      "Bhanjanagar": ["Bhanjanagar Town", "Belaguntha", "Mujagada", "Gallery"],
      "Aska": ["Aska Town", "Nalabanta", "Dharakot", "Sheragada"],
      // Puri Tehsils
      "Puri Sadar": ["Puri Town Outer", "Baliapanda", "Chandanpur", "Talabania"],
      "Pipili": ["Pipili Town", "Dhauli Outer", "Teisipur", "Mangalpur"],
      "Kanas": ["Kanas Bazar", "Sahupada", "Gopinathpur Kanas", "Bijipur"],
      "Satyabadi": ["Sakhigopal", "Alagum", "Sriramchandrapur", "Suando"],
      "Brahmagiri": ["Brahmagiri Town", "Satapada", "Alarnath", "Krushnaprasad"],
      // Balasore Tehsils
      "Balasore Sadar": ["Balasore Industrial Area", "Chandipur Beach", "Remuna", "Kuruda Balasore"],
      "Basta": ["Basta Town", "Amarda Road", "Baliapal", "Sadanandapur"],
      "Jaleswar": ["Jaleswar Bazar", "Laxmannath", "Rajghat", "Khalina"],
      "Soro": ["Soro Town", "Anantapur", "Kupari", "Khaira"],
      "Nilgiri": ["Nilgiri Town", "Sajanagarh", "Mitrapur", "Gopalpur Nilgiri"],
      // Sambalpur Tehsils
      "Sambalpur Town": ["Sambalpur City", "Khetrajpur", "Budharaja", "Ainthapali"],
      "Hirakud": ["Hirakud Dam Area", "Jamadarpali", "Lara", "Mohanty"],
      "Burla": ["Burla Outer", "VSSUT Campus Area", "Chhipilima", "Kirba"],
      "Rengali": ["Rengali Town", "Lapanga", "Katarbaga", "Thelkoli"],
      "Kuchinda": ["Kuchinda Town", "Bamra", "Govindpur", "Jamankira"],
      // Bhadrak Tehsils
      "Bhadrak Town": ["Bhadrak Outer", "Ranital", "Arnapal", "Gelpur"],
      "Dhamnagar": ["Dhamnagar Town", "Dobal", "Kothar", "Sohada"],
      "Basudevpur": ["Basudevpur Town", "Lunga", "Sudarsanpur", "Eram"],
      "Chandbali": ["Chandbali Town", "Dhamra Port Area", "Bansada", "Muraliganj"],
      "Tihidi": ["Tihidi Town", "Pirahat", "Kabarapur", "Baro"]
    }
  },
  "Uttar Pradesh": {
    districts: ["Lucknow", "Kanpur Nagar", "Varanasi", "Agra", "Gautam Buddha Nagar", "Ghaziabad", "Meerut", "Prayagraj", "Gorakhpur"],
    tehsils: {
      "Lucknow": ["Lucknow Sadar", "Malihabad", "Bakshi Ka Talab", "Mohanlalganj"],
      "Kanpur Nagar": ["Kanpur Sadar", "Bilhaund", "Ghatampur", "Bilhana"],
      "Varanasi": ["Varanasi Sadar", "Pindra", "Ganga Pur"],
      "Agra": ["Agra Sadar", "Fatehabad Agra", "Etmadpur", "Kheragarh", "Bah"],
      "Gautam Buddha Nagar": ["Sadar Noida", "Dadri", "Jewar"],
      "Ghaziabad": ["Ghaziabad Sadar", "Loni", "Modinagar"],
      "Meerut": ["Meerut Sadar", "Mawana", "Sardhana"],
      "Prayagraj": ["Sadar Prayagraj", "Phulpur", "Koraon", "Handia", "Karchhana"],
      "Gorakhpur": ["Gorakhpur Sadar", "Campierganj", "Chauri Chaura", "Bansgaon", "Khajni"]
    },
    villages: {
      // Lucknow Tehsils
      "Lucknow Sadar": ["Chinhat", "Gomti Nagar Rural", "Alambagh Outer", "Kakori", "Indira Nagar Village"],
      "Malihabad": ["Malihabad Town", "Kasmandi", "Khetaun", "Khalispur", "Gariha"],
      "Bakshi Ka Talab": ["BKT Rural", "Itaunja", "Manpur", "Kathwara"],
      "Mohanlalganj": ["Mohanlalganj Town", "Gosainganj", "Nagram", "Sissendi"],
      // Kanpur Tehsils
      "Kanpur Sadar": ["Kalyanpur Outer", "Bithoor", "Chakeri", "Mandhana"],
      "Bilhaund": ["Bilhaund Town", "Chaubepur", "Shivrajpur", "Kapoori"],
      "Ghatampur": ["Ghatampur Town", "Patara", "Sajeti", "Reuna"],
      "Bilhana": ["Bilhana Village", "Karah", "Sarsaul", "Rooma"],
      // Varanasi Tehsils
      "Varanasi Sadar": ["Sarnath", "Shivpur", "Ramnagar UP", "Babatpur Outer", "Lohta"],
      "Pindra": ["Pindra Town", "Phoolpur Varanasi", "Sindhaura", "Mangari"],
      "Ganga Pur": ["Ganga Pur Town", "Kachhwa", "Raja Talab", "Mirzamurad"],
      // Agra Tehsils
      "Agra Sadar": ["Tajganj Outer", "Dayalbagh", "Sikandra Outer", "Shamsabad Agra"],
      "Fatehabad Agra": ["Fatehabad Town", "Dhimishri", "Fatehpur Sikri Outer", "Rupbas"],
      "Etmadpur": ["Etmadpur Town", "Tundla Outer", "Firozabad Border", "Barhan"],
      "Kheragarh": ["Kheragarh Town", "Saiyan", "Jagner", "Sanya"],
      "Bah": ["Bah Town", "Pinahat", "Jaitpur", "Fatehpura"],
      // Gautam Buddha Nagar Tehsils
      "Sadar Noida": ["Sector 62", "Mamura", "Harola", "Nithari", "Gijhore", "Chhalera"],
      "Dadri": ["Dadri Town", "Surajpur", "Chhapraula", "Gulistanpur", "Kondli"],
      "Jewar": ["Jewar Rural", "Rabupura", "Dayanatpur", "Jahangirpur", "Bhangel"],
      // Ghaziabad Tehsils
      "Ghaziabad Sadar": ["Sahibabad Area", "Indirapuram Outer", "Dasna", "Muradnagar Outer"],
      "Loni": ["Loni Town", "Ankur Vihar Rural", "Farrukh Nagar", "Behta Hajipur"],
      "Modinagar": ["Modinagar Town", "Niwari", "Patla", "Bhojpur Ghaziabad"],
      // Meerut Tehsils
      "Meerut Sadar": ["Meerut Cantt", "Kanker Khera", "Partapur", "Daurala"],
      "Mawana": ["Mawana Town", "Hastinapur", "Phalauda", "Parikshitgarh"],
      "Sardhana": ["Sardhana Town", "Karnawal", "Lawar", "Daurala West"],
      // Prayagraj Tehsils
      "Sadar Prayagraj": ["Jhalwa", "Naini Outer", "Phaphamau", "Bamrauli"],
      "Phulpur": ["Phulpur Town", "Mungra Badshahpur Outer", "Sarai Akil", "Gesa"],
      "Koraon": ["Koraon Town", "Meja Road", "Manda", "Khiri"],
      "Handia": ["Handia Town", "Saidabad", "Saidpur Prayagraj", "Pratabpur"],
      "Karchhana": ["Karchhana Town", "Chaka", "Naini Village", "Mungari"],
      // Gorakhpur Tehsils
      "Gorakhpur Sadar": ["Gorakhnath Area", "Pipraich", "Bhathat", "Sahjanwa"],
      "Campierganj": ["Campierganj Town", "Peppeganj", "Rawatganj", "Karamila"],
      "Chauri Chaura": ["Chauri Chaura Town", "Mundera Bazar", "Sardar Nagar", "Bhopa"],
      "Bansgaon": ["Bansgaon Town", "Kauriram", "Gagaha", "Uruwa"],
      "Khajni": ["Khajni Town", "Sikriganj", "Unwal", "Belghat"]
    }
  },
  "Madhya Pradesh": {
    districts: ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Dewas", "Ratlam", "Satna"],
    tehsils: {
      "Bhopal": ["Huzur", "Kolar", "Berasia"],
      "Indore": ["Indore Sadar", "Depalpur", "Mhow", "Sanwer"],
      "Jabalpur": ["Jabalpur Sadar", "Sihora", "Patan", "Kundam"],
      "Gwalior": ["Gwalior Sadar", "Bhitarwar", "Dabra", "Chinour"],
      "Ujjain": ["Ujjain Sadar", "Badnagar", "Tarana", "Mahidpur", "Khachrod"],
      "Dewas": ["Dewas Sadar", "Tonk Khurd", "Sonkatch", "Bagli", "Kannod"],
      "Ratlam": ["Ratlam Sadar", "Jaora", "Alot", "Sailana", "Piploda"],
      "Satna": ["Satna Sadar", "Maihar", "Rampur Baghelan", "Amarpatan", "Nagod"]
    },
    villages: {
      // Bhopal Tehsils
      "Huzur": ["Arera Hills Rural", "Bairagarh Outer", "Kolar Road Village", "Karond", "Misrod"],
      "Kolar": ["Kolar Town", "Lalghati", "Bhadbhada", "Naya Pura", "Gehukheda"],
      "Berasia": ["Berasia Town", "Runaha", "Nazirabad", "Lalariya"],
      // Indore Tehsils
      "Indore Sadar": ["Vijay Nagar Outer", "Palasia Village", "Rajendra Nagar Outer", "Rau", "Khajrana"],
      "Depalpur": ["Depalpur Town", "Betma", "Gautampura", "Chambal River Area"],
      "Mhow": ["Mhow Cantt", "Pithampur", "Gujri", "Hasalpur", "Kodariya"],
      "Sanwer": ["Sanwer Town", "Mangliya", "Kshipra", "Chandravatiganj"],
      // Jabalpur Tehsils
      "Jabalpur Sadar": ["Khamaria", "Panagar", "Barela", "Bhedaghat"],
      "Sihora": ["Sihora Town", "Majholi", "Goshalpur", "Khamtara"],
      "Patan": ["Patan Town", "Katangi", "Shahpura Jabalpur", "Belkheda"],
      "Kundam": ["Kundam Town", "Baghraji", "Khamaria Kundam", "Dhanwahi"],
      // Gwalior Tehsils
      "Gwalior Sadar": ["Morar Cantt", "Hazira Outer", "Gwalior Fort Area", "Maharajpura"],
      "Bhitarwar": ["Bhitarwar Town", "Karera Border", "Mohna", "Harsi"],
      "Dabra": ["Dabra Town", "Tekanpur Cantt", "Simariya", "Saloan"],
      "Chinour": ["Chinour Town", "Karhiya", "Kuleth", "Antri"],
      // Ujjain Tehsils
      "Ujjain Sadar": ["Nanakheda", "Ujjain Rural", "Chintaman", "Tajpur Ujjain"],
      "Badnagar": ["Badnagar Town", "Runija", "Ingoria", "Jahagirpur"],
      "Tarana": ["Tarana Town", "Makdon", "Kanasiya", "Nanakheda Tarana"],
      "Mahidpur": ["Mahidpur Town", "Mahidpur Road", "Alot Border", "Jharda"],
      "Khachrod": ["Khachrod Town", "Nagda Outer", "Unhel", "Birlagram"],
      // Dewas Tehsils
      "Dewas Sadar": ["Dewas Industrial Area", "Binjana", "Bairagarh Dewas", "Nagukheri"],
      "Tonk Khurd": ["Tonk Khurd Town", "Choubaradhira", "Rau Dewas", "Muradpura"],
      "Sonkatch": ["Sonkatch Town", "Pushpogiri", "Gandharvsen", "Pipri"],
      "Bagli": ["Bagli Town", "Hatpipliya", "Udainagar", "Punjapura"],
      "Kannod": ["Kannod Town", "Khategaon Outer", "Satwas", "Loharda"],
      // Ratlam Tehsils
      "Ratlam Sadar": ["Ratlam Rural", "Namli", "Bajna Ratlam", "Dharad"],
      "Jaora": ["Jaora Town", "Industrial Area Jaora", "Ringhnod", "Kalukheda"],
      "Alot": ["Alot Town", "Tal Ratlam", "Kharua", "Vikramgarh"],
      "Sailana": ["Sailana Town", "Raoti", "Sarwan", "Shivgarh"],
      "Piploda": ["Piploda Town", "Sherpur Ratlam", "Sukheda", "Dhamnod"],
      // Satna Tehsils
      "Satna Sadar": ["Satna Outer", "Sohawal", "Kothi Satna", "Jaitwara"],
      "Maihar": ["Maihar Devi Mandir Area", "Sarlanagar", "Badera", "Amarpatan Border"],
      "Rampur Baghelan": ["Rampur Town", "Bella Satna", "Sajjanpur", "Kripalpur"],
      "Amarpatan": ["Amarpatan Town", "Ramnagar Satna", "Mukundpur Zoo Area", "Tala Satna"],
      "Nagod": ["Nagod Town", "Unchahara", "Jakhlaun", "Singhpur Satna"]
    }
  },
  "Maharashtra": {
    districts: ["Mumbai City", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Kolhapur", "Solapur"],
    tehsils: {
      "Mumbai City": ["Colaba", "Dharavi", "Bandra Outer", "Kurla Outer"],
      "Pune": ["Pune City", "Haveli", "Maval", "Mulshi", "Baramati", "Shirur"],
      "Nagpur": ["Nagpur Urban", "Nagpur Rural", "Kamptee", "Katol", "Saoner"],
      "Thane": ["Thane Sadar", "Kalyan", "Bhiwandi", "Ulhasnagar", "Shahapur"],
      "Nashik": ["Nashik Sadar", "Sinnar", "Niphad", "Malegaon", "Igatpuri"],
      "Aurangabad": ["Aurangabad City", "Aurangabad Rural", "Kannad", "Paithan", "Gangapur Mah"],
      "Kolhapur": ["Karveer", "Hatkanangle", "Ichalkaranji", "Panhala", "Kagal"],
      "Solapur": ["Solapur North", "Solapur South", "Pandharpur", "Barshi", "Madha"]
    },
    villages: {
      // Mumbai City Tehsils
      "Colaba": ["Nariman Point Area", "Cuffe Parade Area", "Fort Area", "Colaba Market"],
      "Dharavi": ["Sion West", "Mahim Outer", "Matunga Outer", "Dharavi Sector 1"],
      "Bandra Outer": ["Bandra Reclamation", "Khar West Area", "Santacruz Outer", "BKC Area"],
      "Kurla Outer": ["Kurla West", "Chembur Village", "Ghatkopar Outer", "Vikhroli Outer"],
      // Pune Tehsils
      "Pune City": ["Shivajinagar Area", "Kothrud Outer", "Hadapsar Rural", "Pune Camp", "Aundh Village"],
      "Haveli": ["Wagholi", "Kharadi", "Nanded City", "Kondhwa Rural", "Dhayari"],
      "Maval": ["Lonavala", "Khandala", "Talegaon Dabhade", "Kamshet"],
      "Mulshi": ["Hinjawadi IT Park", "Pirangut", "Bhugaon", "Lavasa Area"],
      "Baramati": ["Baramati Rural", "Malegaon Khurd", "Jinjari", "Morgaon"],
      "Shirur": ["Ranjangaon MIDC", "Shirur Town", "Shikrapur", "Nabal"],
      // Nagpur Tehsils
      "Nagpur Urban": ["Sitabuldi", "Dharampeth", "Sadashiv Nagar Nagpur", "Sonegaon Area"],
      "Nagpur Rural": ["Nagpur Outer", "Kalmeshwar Border", "Butibori MIDC", "Wadi Nagpur"],
      "Kamptee": ["Kamptee Cantt", "Kamptee Town", "Kanhan", "Tekadi"],
      "Katol": ["Katol Town", "Kondhali", "Mowad", "Narkhed"],
      "Saoner": ["Saoner Town", "Khapa", "Patansaongi", "Kelod"],
      // Thane Tehsils
      "Thane Sadar": ["Naupada", "Wagle Estate Village", "Kalwa Outer", "Mumbra Rural", "Kopri"],
      "Kalyan": ["Kalyan West Rural", "Dombivli East Rural", "Titwala", "Mharal", "Shahad"],
      "Bhiwandi": ["Bhiwandi Warehouses Area", "Kharbao", "Padgha", "Anjur Phata"],
      "Ulhasnagar": ["Ulhasnagar Sector 1", "Ulhasnagar Sector 3", "Ambernath Outer", "Badlapur Border"],
      "Shahapur": ["Shahapur Town", "Asangaon MIDC", "Vashind", "Khardi"],
      // Nashik Tehsils
      "Nashik Sadar": ["Panchavati", "CIDCO Nashik", "Satpur MIDC", "Deolali Cantt"],
      "Sinnar": ["Sinnar MIDC", "Musalgoan", "Wavi", "Pangri"],
      "Niphad": ["Niphad Town", "Lasalgaon Onion Market", "Pimpalgaon Baswant", "Ozar Airport Area"],
      "Malegaon": ["Malegaon Camp", "Soygaon", "Dhabadi", "Ravand"],
      "Igatpuri": ["Igatpuri Hill Station", "Ghoti", "Manavali", "Talegaon Igatpuri"],
      // Aurangabad Tehsils
      "Aurangabad City": ["Cidco Aurangabad", "Kranti Chowk Area", "Railway Station Area", "Begumpura"],
      "Aurangabad Rural": ["Chikhalthana MIDC", "Harsul", "Waluj MIDC", "Golwadi"],
      "Kannad": ["Kannad Town", "Chalisgaon Border", "Pishor", "Bahirgaon"],
      "Paithan": ["Paithan Town", "Jayakwadi Dam Area", "Bidkin DMIC", "Pachod"],
      "Gangapur Mah": ["Gangapur Town", "Lasur Station", "Valuj Outer", "Shindur"],
      // Kolhapur Tehsils
      "Karveer": ["Kolhapur City Rural", "Uchgaon", "Gandhinagar Kolhapur", "Sanganer Kolhapur"],
      "Hatkanangle": ["Hatkanangle Town", "Shiroli MIDC", "Herle", "Peth Vadgaon"],
      "Ichalkaranji": ["Ichalkaranji Textile Hub", "Kabnur", "Korang", "Yadrav"],
      "Panhala": ["Panhala Fort Area", "Kodoli", "Kale Kolhapur", "Bambavade"],
      "Kagal": ["Kagal MIDC", "Kagal Town", "Murgud", "Sangaon Kagal"],
      // Solapur Tehsils
      "Solapur North": ["Solapur City Rural", "Bale Solapur", "Kegaon", "Soregaon"],
      "Solapur South": ["Kumbhari MIDC", "Vairag Border", "Valsang", "Mandrup"],
      "Pandharpur": ["Pandharpur Temple Town", "Gopalpur Pandharpur", "Karkamb", "Shevgaon"],
      "Barshi": ["Barshi Town", "Vairag", "Pangari Solapur", "Kari Barshi"],
      "Madha": ["Madha Town", "Kurduwadi Junction", "Tembhurni", "Darphal"]
    }
  },
  "Kerala": {
    districts: ["Trivandrum", "Ernakulam", "Kozhikode", "Thrissur", "Palakkad", "Kollam", "Alappuzha", "Kottayam"],
    tehsils: {
      "Trivandrum": ["Thiruvananthapuram Taluk", "Neyyattinkara", "Nedumangad", "Chirayinkeezhu"],
      "Ernakulam": ["Kochi Taluk", "Aluva Taluk", "Kanayannur Taluk", "Kunnathunad"],
      "Kozhikode": ["Kozhikode Taluk", "Koyilandy", "Vadakara", "Thamarassery"],
      "Thrissur": ["Thrissur Taluk", "Chavakkad", "Kodungallur", "Mukundapuram"],
      "Palakkad": ["Palakkad Taluk", "Alathur", "Chittur", "Ottapalam", "Mannarkkad"],
      "Kollam": ["Kollam Taluk", "Karunagappally", "Kottarakkara", "Pathanapuram"],
      "Alappuzha": ["Ambalappuzha Taluk", "Cherthala", "Karthikappally", "Mavelikkara"],
      "Kottayam": ["Kottayam Taluk", "Changanassery", "Meenachil", "Kanjirappally"]
    },
    villages: {
      // Trivandrum Tehsils
      "Thiruvananthapuram Taluk": ["Kazhakoottam", "Pattom Village", "Vattiyoorkavu", "Kovalam", "Peroorkada"],
      "Neyyattinkara": ["Neyyattinkara Town", "Parassala", "Balaramapuram", "Amaravila"],
      "Nedumangad": ["Nedumangad Town", "Aruvikkara", "Vithura", "Palode"],
      "Chirayinkeezhu": ["Attingal", "Varkala Beach", "Chirayinkeezhu Village", "Kadakkavoor"],
      // Ernakulam Tehsils
      "Kochi Taluk": ["Edappally", "Kadavanthra Village", "Vyttila", "Mattancherry", "Fort Kochi"],
      "Aluva Taluk": ["Aluva Town", "Angamaly", "Kalady", "Chengamanad", "Nedumbassery"],
      "Kanayannur Taluk": ["Ernakulam North", "Kakkayur", "Kakkanad IT Space", "Tripunithura", "Kalamassery"],
      "Kunnathunad": ["Perumbavoor", "Kolenchery", "Kizhakkambalam", "Pattimattom"],
      // Kozhikode Tehsils
      "Kozhikode Taluk": ["Calicut City Rural", "Elathur Kozhikode", "Beypore Port", "Mavoor"],
      "Koyilandy": ["Koyilandy Town", "Payyoli", "Balussery", "Atholi"],
      "Vadakara": ["Vadakara Town", "Chorode", "Orkkatteri", "Maniyur"],
      "Thamarassery": ["Thamarassery Town", "Koduvally", "Kunnamangalam", "Thiruvambady"],
      // Thrissur Tehsils
      "Thrissur Taluk": ["Ollur", "Mannuthy", "Ramavarmapuram", "Ayyanthole"],
      "Chavakkad": ["Chavakkad Beach Area", "Guruvayur Temple Area", "Kunnamkulam Outer", "Vadakkekad"],
      "Kodungallur": ["Kodungallur Town", "Methala", "Eriyad", "Lokamaleswaram"],
      "Mukundapuram": ["Irinjalakuda Town", "Chalakudy Outer", "Pudukkad", "Aloor"],
      // Palakkad Tehsils
      "Palakkad Taluk": ["Palakkad Town Outer", "Pirayiri", "Pudussery Kanjikode MIDC", "Malampuzha Area"],
      "Alathur": ["Alathur Town", "Kuzhalmannam", "Wadakkanchery Border", "Tarur"],
      "Chittur": ["Chittur-Thathamangalam", "Kozhinjampara", "Meenakshipuram", "Nelliampathy"],
      "Ottapalam": ["Ottapalam Town", "Shoranur Railway Area", "Cherpulassery", "Pattambi Outer"],
      "Mannarkkad": ["Mannarkkad Town", "Attappady Valley", "Agali", "Kanjirapuzha Dam Area"],
      // Kollam Tehsils
      "Kollam Taluk": ["Kollam Beach Outer", "Eravipuram", "Kottiyam", "Chathannoor"],
      "Karunagappally": ["Karunagappally Town", "Oachira", "Chavara KRE Area", "Clappana"],
      "Kottarakkara": ["Kottarakkara Town", "Ezhukone", "Punalur Border", "Veliyam"],
      "Pathanapuram": ["Pathanapuram Town", "Punalur Town", "Anchal Kollam", "Thenmala Echo Tourism"],
      // Alappuzha Tehsils
      "Ambalappuzha Taluk": ["Alappuzha Houseboat Area", "Kalavoor", "Punnapra", "Mannancherry"],
      "Cherthala": ["Cherthala Town", "Aroor Industrial Area", "Ezhupunna", "Mararikulam"],
      "Karthikappally": ["Haripad", "Kayamkulam Outer", "Nangiarkulangara", "Thrikkunnapuzha"],
      "Mavelikkara": ["Mavelikkara Town", "Chengannur Outer", "Harippad Border", "Kayamkulam Border"],
      // Kottayam Tehsils
      "Kottayam Taluk": ["Kumarakom Lake Resort Area", "Kanjikuzhy Kottayam", "Vijayapuram", "Ettumanoor"],
      "Changanassery": ["Changanassery Town", "Kurichy", "Vazhoor", "Karukachal"],
      "Meenachil": ["Pala Town", "Erattupetta", "Bharananganam", "Poonjar"],
      "Kanjirappally": ["Kanjirappally Town", "Mundakayam", "Erumely Forest Gate", "Ponkunnam"]
    }
  },
  "Bihar": {
    districts: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Arrah", "Nalanda", "Purnia"],
    tehsils: {
      "Patna": ["Patna Sadar Anchal", "Danapur Anchal", "Phulwari Sharif Anchal", "Fatuha Anchal", "Barh Anchal"],
      "Gaya": ["Gaya Sadar Anchal", "Bodhgaya Anchal", "Sherghati Anchal", "Dobhi Anchal", "Wazirganj Anchal"],
      "Muzaffarpur": ["Mushahari Anchal", "Kanti Anchal", "Sakra Anchal", "Baruraj Anchal", "Sahebganj Anchal"],
      "Bhagalpur": ["Jagdishpur Anchal", "Nathnagar Anchal", "Sultanganj Anchal", "Kahalgaon Anchal"],
      "Darbhanga": ["Darbhanga Sadar Anchal", "Benipur Anchal", "Baheri Anchal", "Hayaghat Anchal"],
      "Arrah": ["Ara Sadar Anchal", "Piro Anchal", "Jagdishpur Ara Anchal", "Shahpur Anchal"],
      "Nalanda": ["Biharsharif Anchal", "Rajgir Anchal", "Harnaut Anchal", "Hilsa Anchal"],
      "Purnia": ["Purnia East Anchal", "Banmankhi Anchal", "Dhamdaha Anchal", "Kasba Anchal"]
    },
    villages: {
      // Patna Tehsils
      "Patna Sadar Anchal": ["Kankarbagh Outer", "Patliputra Sector", "Mahendru Town", "Patna City Rural", "Digha"],
      "Danapur Anchal": ["Danapur Cantt", "Khagaul", "Naubatpur", "Maner", "Bihta"],
      "Phulwari Sharif Anchal": ["Phulwari Bazar", "Anisabad", "Janipur", "Khagaul Road Outer"],
      "Fatuha Anchal": ["Fatuha Industrial Town", "Didarganj", "Jethuli", "Sampatchak"],
      "Barh Anchal": ["Barh Sadar", "Bakhtiyarpur Outer", "Athmalgola", "Pandarak"],
      // Gaya Tehsils
      "Gaya Sadar Anchal": ["Gaya Town Rural", "Delha", "Manpur", "Chandauti"],
      "Bodhgaya Anchal": ["Bodhgaya Temple Area", "Mastuipur", "Bakrour", "Urel"],
      "Sherghati Anchal": ["Sherghati Town", "Dobhi Border", "Amas", "Bankey Bazar"],
      "Dobhi Anchal": ["Dobhi Bazar", "Barachatti", "Niranjanpur", "Mohanpur Bihar"],
      "Wazirganj Anchal": ["Wazirganj Town", "Fatehpur Gaya", "Tankuppa", "Manpur East"],
      // Muzaffarpur Tehsils
      "Mushahari Anchal": ["Muzaffarpur Sadar Outer", "Khabra", "Bairia Outer", "Ramna"],
      "Kanti Anchal": ["Kanti Thermal Power Area", "Marwan", "Narsinghpur", "Kaparpura"],
      "Sakra Anchal": ["Sakra Bazar", "Dholi", "Piar", "Silout"],
      "Baruraj Anchal": ["Baruraj Town", "Motipur Outer", "Paroo", "Deoria Bihar"],
      "Sahebganj Anchal": ["Sahebganj Town", "Minapur Outer", "Katra Muzaffarpur", "Bochahan"],
      // Bhagalpur Tehsils
      "Jagdishpur Anchal": ["Bhagalpur Sadar Outer", "Sabour", "Aliganj Bhagalpur", "Babupur"],
      "Nathnagar Anchal": ["Nathnagar Bazar", "Champanagar", "Madhusudanpur", "Kajvally"],
      "Sultanganj Anchal": ["Sultanganj Ganga Ghat", "Asarganj Border", "Tarapur Border", "Akbarnagar"],
      "Kahalgaon Anchal": ["NTPC Kahalgaon Area", "Ghogha", "Colgong Town", "Ekchari"],
      // Darbhanga Tehsils
      "Darbhanga Sadar Anchal": ["Laheriasarai", "Darbhanga Outer", "Mabbi", "Bahadurpur"],
      "Benipur Anchal": ["Benipur Town", "Bahera Bazar", "Alinagar", "Ghanshyampur"],
      "Baheri Anchal": ["Baheri Bazar", "Hajipur Darbhanga", "Pandaul Border", "Biraul Border"],
      "Hayaghat Anchal": ["Hayaghat Town", "Laheriasarai Outer", "Rambhadrapur", "Thalwara"],
      // Ara Tehsils
      "Ara Sadar Anchal": ["Ara Junction Outer", "Ramna Ara", "Zero Mile Ara", "Udwantnagar"],
      "Piro Anchal": ["Piro Town", "Charpokhari", "Tarari", "Hasan Bazar"],
      "Jagdishpur Ara Anchal": ["Jagdishpur Fort Area", "Behea", "Shahpur Border", "Nayatotla"],
      "Shahpur Anchal": ["Shahpur Town", "Karnaul Ara", "Banahi", "Ishwarpura"],
      // Nalanda Tehsils
      "Biharsharif Anchal": ["Ramchandrapur", "Sohsarai", "Rahui", "Asthawan"],
      "Rajgir Anchal": ["Rajgir Hot Springs Area", "Silao", "Nalanda Ruins Area", "Giriak"],
      "Harnaut Anchal": ["Harnaut Bazar", "Chandi Nalanda", "Rahui Border", "Kalyan Bigha"],
      "Hilsa Anchal": ["Hilsa Town", "Ekangarsarai", "Karai Parsurai", "Parwalpur"],
      // Purnia Tehsils
      "Purnia East Anchal": ["Purnia Town Outer", "Gulabbagh Mandi", "Line Bazar Area", "Maranga"],
      "Banmankhi Anchal": ["Banmankhi Sugar Mill Area", "Kalyanpur Banmankhi", "Dhamdaha Border", "Sarsi"],
      "Dhamdaha Anchal": ["Dhamdaha Town", "Rupauli", "Bhawanipur Bihar", "Kothi Dhamdaha"],
      "Kasba Anchal": ["Kasba Town", "Jalalgarh", "Srinagar Purnia", "Garhbanaili"]
    }
  },
  "Punjab": {
    districts: ["Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot", "Hoshiarpur"],
    tehsils: {
      "Ludhiana": ["Ludhiana West", "Ludhiana East", "Khanna", "Jagraon", "Samrala"],
      "Amritsar": ["Amritsar I", "Amritsar II", "Ajnala", "Baba Bakala"],
      "Jalandhar": ["Jalandhar I", "Jalandhar II", "Nakodar", "Phillaur", "Shahkot"],
      "Patiala": ["Patiala Sadar", "Nabha", "Rajpura", "Samana", "Patran"],
      "Bathinda": ["Bathinda Sadar", "Rampura Phul", "Talwandi Sabo", "Maur"],
      "Mohali": ["Kharar", "Dera Bassi", "Mohali Sadar", "Majri"],
      "Pathankot": ["Pathankot Sadar", "Dhar Kalan", "Sughar"],
      "Hoshiarpur": ["Hoshiarpur Sadar", "Dasuya", "Mukerian", "Garhshankar"]
    },
    villages: {
      // Ludhiana Tehsils
      "Ludhiana West": ["Model Town Block", "Sarabha Nagar Outer", "Ferozepur Road Block", "Bhai Randhir Singh Nagar", "Sunet"],
      "Ludhiana East": ["Jamalpur", "Sahnewal", "Baddowal", "Mundian Kalan", "Doraha"],
      "Khanna": ["Khanna GT Road Area", "Alour", "Bhadla", "Samrala Road Area"],
      "Jagraon": ["Jagraon Mandi", "Sidwan Bet", "Chowkimann", "Galib Kalan"],
      "Samrala": ["Samrala Town", "Machaian", "Bondli", "Neelon"],
      // Amritsar Tehsils
      "Amritsar I": ["Golden Temple Outer", "Ranjit Avenue", "Verka", "Vallah"],
      "Amritsar II": ["Chheharta", "Attari Border Area", "Khasa", "Gharinda"],
      "Ajnala": ["Ajnala Town", "Ramdas", "Chogawan", "Lopoke"],
      "Baba Bakala": ["Rayya", "Baba Bakala Town", "Beas", "Khadoor Sahib Border"],
      // Jalandhar Tehsils
      "Jalandhar I": ["Model Town Jalandhar", "Cantt Area Jalandhar", "Rama Mandi", "Pathankot Bypass Area"],
      "Jalandhar II": ["Kartarpur", "Maqsudan", "Bhogiwal", "Adampur Airport Area"],
      "Nakodar": ["Nakodar Town", "Mehatpur", "Shahkot Border", "Shankar"],
      "Phillaur": ["Phillaur Fort Area", "Goraya", "Apra", "Ludhiana Border Area"],
      "Shahkot": ["Shahkot Town", "Malsian", "Lohian Khas", "Rupewali"],
      // Patiala Tehsils
      "Patiala Sadar": ["Sanaur", "Patiala Cantt", "Baran", "Bahadurgarh Patiala"],
      "Nabha": ["Nabha Town", "Bhadson", "Amloh Border", "Aloharan"],
      "Rajpura": ["Rajpura Industrial Area", "Banur", "Ghanour", "Shambhu Border"],
      "Samana": ["Samana Town", "Ghagga", "Mardanpur", "Shutrana"],
      "Patran": ["Patran Town", "Shutrana Border", "Jakhal Border", "Ghulal"],
      // Bathinda Tehsils
      "Bathinda Sadar": ["Bathinda Cantt Area", "Goniana", "Bhucho Mandi", "Thermal Colony"],
      "Rampura Phul": ["Rampura Town", "Phul Town", "Bhagta Bhai Ka", "Balianwali"],
      "Talwandi Sabo": ["Damdama Sahib Area", "Rama Mandi Bathinda", "Maur Border", "Singo"],
      "Maur": ["Maur Mandi", "Maisarkhana", "Kot Fatta", "Yahi"],
      // Mohali Tehsils
      "Kharar": ["Landran", "Kuni Majra", "Sunny Enclave Area", "Gharuan"],
      "Dera Bassi": ["Zirakpur", "Dhakoli", "Lalru Industrial Area", "Mubarikpur Punjab"],
      "Mohali Sadar": ["Sector 62 Mohali", "Phase 3B2 Area", "Phase 7 Area", "Sohana"],
      "Majri": ["Mullanpur Garibdass", "New Chandigarh Sector", "Siswan", "Karoran"],
      // Pathankot Tehsils
      "Pathankot Sadar": ["Mamun Cantt", "Sujanpur Pathankot", "Jugial", "Mirzapur Pathankot"],
      "Dhar Kalan": ["Dhar Kalan Town", "Dunera", "Ranjit Sagar Dam Area", "Shahpur Kandi"],
      "Sughar": ["Sughar Town", "Gharota", "Taragarh", "Mirthal"],
      // Hoshiarpur Tehsils
      "Hoshiarpur Sadar": ["Hariana", "Bajwara", "Pipawal", "Sham Chaurasi"],
      "Dasuya": ["Dasuya Town", "Gardhiwala", "Urmar Tanda", "Talwara Dam Area"],
      "Mukerian": ["Mukerian Town", "Talwara Outer", "Hajibazar", "Datarpur"],
      "Garhshankar": ["Garhshankar Town", "Saila Khurd", "Mahilpur", "Posheshwar"]
    }
  }
};

const getOfflineLandOptions = async (body) => {
  const state = body.state || "Rajasthan";
  const district = body.district;
  const tehsil = body.tehsil;

  const stateData = landDatabase[state];
  if (!stateData) {
    return {
      districts: [`${state} District A`, `${state} District B`],
      tehsils: [],
      extraRegions: [],
      villages: [],
      years: ["2026", "2025", "2024"],
    };
  }

  const result = {
    districts: stateData.districts,
    tehsils: [],
    extraRegions: [],
    villages: [],
    years: ["2026", "2025", "2024"],
  };

  if (!district) return result;

  // Kerala state directly queries villages under district (no intermediate tehsil selector)
  if (state === 'Kerala') {
    let matchedDistrict = stateData.districts.find(d => d.toLowerCase() === district.toLowerCase()) || stateData.districts[0];
    const taluks = stateData.tehsils[matchedDistrict] || [];
    let allVillages = [];
    taluks.forEach(taluk => {
      if (stateData.villages[taluk]) {
        allVillages = allVillages.concat(stateData.villages[taluk]);
      }
    });
    result.villages = allVillages.length > 0 ? allVillages : [`${district} Village A`, `${district} Village B`];
    result.tehsils = taluks;
    return result;
  }

  let matchedDistrict = stateData.districts.find(d => d.toLowerCase() === district.toLowerCase()) || stateData.districts[0];
  result.tehsils = stateData.tehsils[matchedDistrict] || [`${district} Tehsil A`, `${district} Tehsil B`];

  if (!tehsil) return result;

  // Bihar state has extra region selector (Halka)
  if (state === 'Bihar') {
    result.extraRegions = [`${tehsil} Halka 1`, `${tehsil} Halka 2`];
  }

  const tehsilsList = stateData.tehsils[matchedDistrict] || [];
  let matchedTehsil = tehsilsList.find(t => t.toLowerCase() === tehsil.toLowerCase()) || tehsilsList[0];
  
  // If villages map is missing for the matched tehsil, dynamically construct villages list
  result.villages = stateData.villages[matchedTehsil] || [
    `${matchedTehsil} Village 1`,
    `${matchedTehsil} Village 2`,
    `${matchedTehsil} Village 3`
  ];

  return result;
};

module.exports = {
  getOfflineLandOptions,
  landDatabase
};
