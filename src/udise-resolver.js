  async queryDirectory(udiseCode) {
    // 1. Direct National SRC API query via an unblocked open relay
    const targetEndpoint = `https://src.udiseplus.gov.in/api/school-info/by-udise/${udiseCode}`;
    
    // Primary Gateway: CodeTabs unblocked CORS relay
    const relayUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetEndpoint)}`;

    let schoolData = null;

    try {
      const response = await fetch(relayUrl);
      if (response.ok) {
        schoolData = await response.json();
      }
    } catch (_) {
      // Fallback Relay if primary is busy
      try {
        const altRelay = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetEndpoint)}`;
        const altResponse = await fetch(altRelay);
        if (altResponse.ok) {
          schoolData = await altResponse.json();
        }
      } catch (err) {
        console.error("Relay lookup failed", err);
      }
    }

    // 2. Validate official response payload
    if (!schoolData || (!schoolData.schoolName && !schoolData.school_name)) {
      throw new Error(`U-DISE code ${udiseCode} was not found in the national registry. Please check the 11 digits.`);
    }

    // 3. Extract and normalize national school metadata
    const name = (schoolData.schoolName || schoolData.school_name || '').toUpperCase();
    const district = (schoolData.districtName || schoolData.district_name || '').toUpperCase();
    const block = (schoolData.blockName || schoolData.block_name || '').toUpperCase();
    const state = (schoolData.stateName || schoolData.state_name || '').toUpperCase();
    const catStr = schoolData.categoryName || schoolData.school_category || '';

    // Automatically detect Primary (LP) vs Upper Primary (UP)
    const category = /Upper|Middle|ME|MES|Composite/i.test(catStr) ? 'UP' : 'LP';

    return {
      udise: udiseCode,
      schoolName: name,
      district: district,
      block: block,
      state: state,
      category: category,
      anchoredAt: new Date().toISOString()
    };
  }
