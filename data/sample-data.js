/*
 * DỮ LIỆU MẪU (số liệu minh hoạ, KHÔNG phải kết quả test thật).
 * Chỉ dùng khi chưa cấu hình link Google Sheets trong js/config.js.
 * Định dạng: JSON chuẩn, tên trường = tên cột trong Google Sheets.
 */
window.LAB = window.LAB || {};
LAB.SAMPLE = {
  "laptops": [
    {
      "id": "dell-xps-13-2026", "name": "Dell XPS 13 (2026)", "brand": "Dell", "model": "XPS 9360", "year": "2026",
      "test_date": "2026-10-06", "tester": "Demo", "image_url": "", "review_url": "https://tinhte.vn/", "hidden": "",
      "cpu": "Intel Core Ultra 7 358H", "gpu": "Intel Arc B390", "gpu_tgp_w": "", "ram": "16 GB LPDDR5X", "storage": "512 GB SSD", "weight_kg": "1.2", "os": "Windows 11 Home",
      "cb24_single": "128", "cb24_multi": "1050", "cbr23_single": "2050", "cbr23_multi": "16800",
      "gb7_single_ac": "2296", "gb7_multi_ac": "7799", "gb7_gpu_ac": "11982", "gb7_single_bat": "1954", "gb7_multi_bat": "6920", "gb7_gpu_bat": "11671",
      "gb6_single_ac": "2900", "gb6_multi_ac": "14500", "gb6_gpu_ac": "38000", "gb6_single_bat": "2610", "gb6_multi_bat": "12800", "gb6_gpu_bat": "37100",
      "tdm_timespy": "6400", "tdm_steelnomad": "1900", "tdm_steelnomad_light": "9800", "tdm_wildlife_extreme": "9000",
      "pcmark10": "7600", "procyon_office": "7400", "procyon_photo": "6900", "procyon_video": "6100", "procyon_ai": "",
      "display_size": "13.4", "display_resolution": "2880 x 1800", "display_refresh_hz": "120", "display_panel": "OLED",
      "display_brightness": "400", "display_srgb": "100", "display_dcip3": "100", "display_adobergb": "95", "display_deltae": "0.8", "display_contrast": "∞",
      "battery_wh": "70", "charger_w": "60", "battery_office": "14:20", "battery_video": "18:05", "battery_gaming": "1:35",
      "notes": "Máy mát, quạt gần như không chạy khi làm việc văn phòng."
    },
    {
      "id": "asus-rog-zephyrus-g16-2026", "name": "ASUS ROG Zephyrus G16 (2026)", "brand": "ASUS", "model": "GU605", "year": "2026",
      "test_date": "2026-09-28", "tester": "Demo", "image_url": "", "review_url": "https://tinhte.vn/", "hidden": "",
      "cpu": "Intel Core Ultra 9 386H", "gpu": "NVIDIA GeForce RTX 5080 Laptop", "gpu_tgp_w": "150", "ram": "32 GB LPDDR5X", "storage": "2 TB SSD", "weight_kg": "1.95", "os": "Windows 11 Home",
      "cb24_single": "135", "cb24_multi": "1600", "cbr23_single": "2200", "cbr23_multi": "28500",
      "gb7_single_ac": "2480", "gb7_multi_ac": "9800", "gb7_gpu_ac": "95000", "gb7_single_bat": "1980", "gb7_multi_bat": "6900", "gb7_gpu_bat": "41000",
      "gb6_single_ac": "3100", "gb6_multi_ac": "17500", "gb6_gpu_ac": "160000", "gb6_single_bat": "2400", "gb6_multi_bat": "11000", "gb6_gpu_bat": "60000",
      "tdm_timespy": "21500", "tdm_steelnomad": "6800", "tdm_steelnomad_light": "27500", "tdm_wildlife_extreme": "38000",
      "pcmark10": "8900", "procyon_office": "8100", "procyon_photo": "9200", "procyon_video": "8800", "procyon_ai": "1100",
      "display_size": "16", "display_resolution": "2560 x 1600", "display_refresh_hz": "240", "display_panel": "OLED",
      "display_brightness": "500", "display_srgb": "100", "display_dcip3": "100", "display_adobergb": "92", "display_deltae": "1.1", "display_contrast": "",
      "battery_wh": "90", "charger_w": "240", "battery_office": "7g10p", "battery_video": "9g30p", "battery_gaming": "1g05p",
      "notes": "Khi chạy pin hiệu năng GPU giảm mạnh, nên cắm sạc khi chơi game."
    },
    {
      "id": "macbook-air-13-m5", "name": "MacBook Air 13 M5", "brand": "Apple", "model": "", "year": "2026",
      "test_date": "2026-08-15", "tester": "Demo", "image_url": "", "review_url": "", "hidden": "",
      "cpu": "Apple M5 (10 nhân CPU)", "gpu": "Apple M5 (10 nhân GPU)", "gpu_tgp_w": "", "ram": "16 GB", "storage": "512 GB SSD", "weight_kg": "1.24", "os": "macOS",
      "cb24_single": "180", "cb24_multi": "1020", "cbr23_single": "2350", "cbr23_multi": "13500",
      "gb7_single_ac": "", "gb7_multi_ac": "", "gb7_gpu_ac": "", "gb7_single_bat": "", "gb7_multi_bat": "", "gb7_gpu_bat": "",
      "gb6_single_ac": "4200", "gb6_multi_ac": "16000", "gb6_gpu_ac": "52000", "gb6_single_bat": "4190", "gb6_multi_bat": "15950", "gb6_gpu_bat": "51800",
      "tdm_timespy": "", "tdm_steelnomad": "", "tdm_steelnomad_light": "8600", "tdm_wildlife_extreme": "11000",
      "pcmark10": "", "procyon_office": "", "procyon_photo": "", "procyon_video": "", "procyon_ai": "",
      "display_size": "13.6", "display_resolution": "2560 x 1664", "display_refresh_hz": "60", "display_panel": "IPS",
      "display_brightness": "500", "display_srgb": "100", "display_dcip3": "99", "display_adobergb": "88", "display_deltae": "0.9", "display_contrast": "1200",
      "battery_wh": "53.8", "charger_w": "30", "battery_office": "15:40", "battery_video": "19:10", "battery_gaming": "",
      "notes": ""
    },
    {
      "id": "lenovo-legion-5-gen-10", "name": "Lenovo Legion 5 Gen 10", "brand": "Lenovo", "model": "15AHP10", "year": "2025",
      "test_date": "2026-07-20", "tester": "Demo", "image_url": "", "review_url": "", "hidden": "",
      "cpu": "AMD Ryzen 7 260", "gpu": "NVIDIA GeForce RTX 5060 Laptop", "gpu_tgp_w": "115", "ram": "16 GB DDR5", "storage": "1 TB SSD", "weight_kg": "2.3", "os": "Windows 11 Home",
      "cb24_single": "112", "cb24_multi": "1050", "cbr23_single": "1850", "cbr23_multi": "17500",
      "gb7_single_ac": "", "gb7_multi_ac": "", "gb7_gpu_ac": "", "gb7_single_bat": "", "gb7_multi_bat": "", "gb7_gpu_bat": "",
      "gb6_single_ac": "2700", "gb6_multi_ac": "13500", "gb6_gpu_ac": "110000", "gb6_single_bat": "1700", "gb6_multi_bat": "8600", "gb6_gpu_bat": "45000",
      "tdm_timespy": "12500", "tdm_steelnomad": "3100", "tdm_steelnomad_light": "14500", "tdm_wildlife_extreme": "21000",
      "pcmark10": "8200", "procyon_office": "7700", "procyon_photo": "8300", "procyon_video": "7600", "procyon_ai": "",
      "display_size": "15.1", "display_resolution": "2560 x 1600", "display_refresh_hz": "165", "display_panel": "IPS",
      "display_brightness": "500", "display_srgb": "100", "display_dcip3": "78", "display_adobergb": "74", "display_deltae": "1.4", "display_contrast": "1250",
      "battery_wh": "80", "charger_w": "245", "battery_office": "6:30", "battery_video": "8:10", "battery_gaming": "1:10",
      "notes": ""
    },
    {
      "id": "asus-zenbook-a14-x2", "name": "ASUS Zenbook A14 (Snapdragon X2 Elite)", "brand": "ASUS", "model": "UX3407", "year": "2026",
      "test_date": "2026-09-10", "tester": "Demo", "image_url": "", "review_url": "", "hidden": "",
      "cpu": "Qualcomm Snapdragon X2 Elite X2E-88-100", "gpu": "Qualcomm Adreno X2-90", "gpu_tgp_w": "", "ram": "32 GB LPDDR5X", "storage": "1 TB SSD", "weight_kg": "0.98", "os": "Windows 11 Home",
      "cb24_single": "125", "cb24_multi": "1350", "cbr23_single": "", "cbr23_multi": "",
      "gb7_single_ac": "2350", "gb7_multi_ac": "9100", "gb7_gpu_ac": "16000", "gb7_single_bat": "2330", "gb7_multi_bat": "8950", "gb7_gpu_bat": "15800",
      "gb6_single_ac": "3700", "gb6_multi_ac": "18500", "gb6_gpu_ac": "28000", "gb6_single_bat": "3650", "gb6_multi_bat": "18000", "gb6_gpu_bat": "27500",
      "tdm_timespy": "", "tdm_steelnomad": "", "tdm_steelnomad_light": "7200", "tdm_wildlife_extreme": "9500",
      "pcmark10": "", "procyon_office": "6800", "procyon_photo": "", "procyon_video": "", "procyon_ai": "2400",
      "display_size": "14", "display_resolution": "1920 x 1200", "display_refresh_hz": "60", "display_panel": "OLED",
      "display_brightness": "400", "display_srgb": "100", "display_dcip3": "100", "display_adobergb": "94", "display_deltae": "0.9", "display_contrast": "∞",
      "battery_wh": "70", "charger_w": "65", "battery_office": "19:20", "battery_video": "22:10", "battery_gaming": "2:30",
      "notes": ""
    },
    {
      "id": "acer-aspire-lite-14", "name": "Acer Aspire Lite 14", "brand": "Acer", "model": "AL14-52P", "year": "2025",
      "test_date": "2026-06-02", "tester": "Demo", "image_url": "", "review_url": "", "hidden": "",
      "cpu": "Intel Core 5 120U", "gpu": "Intel Graphics", "gpu_tgp_w": "", "ram": "16 GB DDR5", "storage": "512 GB SSD", "weight_kg": "1.4", "os": "Windows 11 Home",
      "cb24_single": "98", "cb24_multi": "480", "cbr23_single": "1650", "cbr23_multi": "7800",
      "gb7_single_ac": "", "gb7_multi_ac": "", "gb7_gpu_ac": "", "gb7_single_bat": "", "gb7_multi_bat": "", "gb7_gpu_bat": "",
      "gb6_single_ac": "2350", "gb6_multi_ac": "7900", "gb6_gpu_ac": "12500", "gb6_single_bat": "2100", "gb6_multi_bat": "6800", "gb6_gpu_bat": "11800",
      "tdm_timespy": "1650", "tdm_steelnomad": "", "tdm_steelnomad_light": "2600", "tdm_wildlife_extreme": "3800",
      "pcmark10": "5600", "procyon_office": "5200", "procyon_photo": "", "procyon_video": "", "procyon_ai": "",
      "display_size": "14", "display_resolution": "1920 x 1200", "display_refresh_hz": "60", "display_panel": "IPS",
      "display_brightness": "300", "display_srgb": "62", "display_dcip3": "45", "display_adobergb": "43", "display_deltae": "3.2", "display_contrast": "1000",
      "battery_wh": "53", "charger_w": "65", "battery_office": "8:05", "battery_video": "10:20", "battery_gaming": "",
      "notes": "Màn hình độ phủ màu thấp, chỉ phù hợp học tập, văn phòng."
    }
  ],
  "games": [
    { "laptop_id": "asus-rog-zephyrus-g16-2026", "game": "Cyberpunk 2077", "resolution": "2560 x 1600", "preset": "Ultra + Ray Tracing", "fps_avg": "98", "fps_low": "78", "notes": "DLSS Quality + Frame Gen" },
    { "laptop_id": "asus-rog-zephyrus-g16-2026", "game": "Black Myth: Wukong", "resolution": "2560 x 1600", "preset": "Very High", "fps_avg": "85", "fps_low": "70", "notes": "DLSS Quality" },
    { "laptop_id": "asus-rog-zephyrus-g16-2026", "game": "Counter-Strike 2", "resolution": "1920 x 1200", "preset": "High", "fps_avg": "290", "fps_low": "180", "notes": "" },
    { "laptop_id": "lenovo-legion-5-gen-10", "game": "Cyberpunk 2077", "resolution": "1920 x 1200", "preset": "High", "fps_avg": "82", "fps_low": "65", "notes": "DLSS Quality" },
    { "laptop_id": "lenovo-legion-5-gen-10", "game": "Black Myth: Wukong", "resolution": "1920 x 1200", "preset": "High", "fps_avg": "64", "fps_low": "52", "notes": "DLSS Quality" },
    { "laptop_id": "lenovo-legion-5-gen-10", "game": "Counter-Strike 2", "resolution": "1920 x 1200", "preset": "High", "fps_avg": "240", "fps_low": "150", "notes": "" },
    { "laptop_id": "lenovo-legion-5-gen-10", "game": "Valorant", "resolution": "1920 x 1200", "preset": "Max", "fps_avg": "380", "fps_low": "260", "notes": "" },
    { "laptop_id": "dell-xps-13-2026", "game": "Counter-Strike 2", "resolution": "1920 x 1200", "preset": "Low", "fps_avg": "78", "fps_low": "55", "notes": "" },
    { "laptop_id": "dell-xps-13-2026", "game": "Valorant", "resolution": "1920 x 1200", "preset": "High", "fps_avg": "165", "fps_low": "110", "notes": "" },
    { "laptop_id": "dell-xps-13-2026", "game": "League of Legends", "resolution": "1920 x 1200", "preset": "Very High", "fps_avg": "210", "fps_low": "150", "notes": "" },
    { "laptop_id": "asus-zenbook-a14-x2", "game": "League of Legends", "resolution": "1920 x 1200", "preset": "Very High", "fps_avg": "150", "fps_low": "100", "notes": "" },
    { "laptop_id": "asus-zenbook-a14-x2", "game": "Counter-Strike 2", "resolution": "1920 x 1200", "preset": "Low", "fps_avg": "55", "fps_low": "38", "notes": "Chạy qua giả lập Prism" }
  ]
};
