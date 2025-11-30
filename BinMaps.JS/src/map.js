// ============================================================
// ЧАСТ 1/6: ГЛОБАЛНИ ПРОМЕНЛИВИ И ИНИЦИАЛИЗАЦИЯ
// ============================================================

var m, c = [], mk = [], rc = { north: null, south: null }, rm = { north: [], south: [] };
var zp = { north: null, south: null }, zv = false, am = false, dp, kb;

// Константи за камиона
const TRUCK_CAPACITY = 15000; // 15 м³ в литри
const MIN_FILL_TARGET = 0.90; // 90% минимално запълване

// Кеш за разстояния (глобален за цялата сесия)
const distCache = {};

document.addEventListener('DOMContentLoaded', async function () {
    // Инициализация на променливи
    c = []; mk = []; rc = { north: null, south: null }; rm = { north: [], south: [] };
    zp = { north: null, south: null }; zv = false; am = false;

    // Конфигурация на Казанлък
    kb = {
        centerLat: 42.6191,
        centerLon: 25.3978,
        dividingLine: 42.6191,
        minLat: 42.60,
        maxLat: 42.65,
        minLon: 25.35,
        maxLon: 25.45
    };

    // Гаражи (депа)
    dp = {
        north: { id: 'depot-north', lat: 42.6250, lon: 25.3978, name: 'Гараж Север', fillLevel: 0, zone: 'north' },
        south: { id: 'depot-south', lat: 42.6130, lon: 25.3978, name: 'Гараж Юг', fillLevel: 0, zone: 'south' }
    };

    // Инициализация на картата
    m = L.map('map').setView([kb.centerLat, kb.centerLon], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(m);

    // Зареждане директно от containers.json (НЯМА повече случайно генериране!)
    await loadContainersFromJson();

    // Button handlers
    const addBtn = document.getElementById("addModeBtn");
    if (addBtn) {
        addBtn.onclick = function () {
            am = !am;
            this.textContent = am ? "Кликни на картата..." : "Добави контейнер";
            this.style.background = am ? "#ffc107" : "";
        };
    }

    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) exportBtn.onclick = exportContainers;

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && e.key === 'n') { e.preventDefault(); generateRoute('north'); }
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); generateRoute('south'); }
        if (e.ctrlKey && e.key === 'b') { e.preventDefault(); generateRoute('both'); }
        if (e.ctrlKey && e.key === 'c') { e.preventDefault(); clearRoute(); }
    });

    // Ръчно добавяне на контейнер с клик (по желание)
    m.on('click', function (e) {
        if (!am) return;
        const z = e.latlng.lat >= kb.dividingLine ? "north" : "south";
        const nc = {
            id: Date.now(),
            lat: e.latlng.lat,
            lon: e.latlng.lng,
            fillLevel: Math.floor(Math.random() * 100),
            address: "Ръчно добавен",
            zone: z,
            type: "manual",
            capacity: 1100
        };
        c.push(nc);
        am = false;
        if (addBtn) { addBtn.textContent = "Добави контейнер"; addBtn.style.background = ""; }
        displayContainers();
    });
});

// ============================================================
// ЗАРЕЖДАНЕ НА КОНТЕЙНЕРИ ОТ containers.json
// ============================================================

async function loadContainersFromJson() {
    try {
        const response = await fetch('containers.json');
        if (!response.ok) throw new Error('Не можа да се зареди containers.json');

        const data = await response.json();

        c = data.map(item => ({
            id: item.id,
            lat: item.lat,
            lon: item.lon,
            fillLevel: item.fillLevel,
            zone: item.zone,
            type: item.type || "generated",
            address: item.address || `Контейнер #${item.id}`,
            capacity: 1100
        }));

        console.log(`Заредени ${c.length} контейнера от containers.json`);
        if (document.getElementById('dataSource')) {
            document.getElementById('dataSource').textContent = `Данни: ${c.length} контейнера (от containers.json)`;
        }
        if (document.getElementById('initMessage')) {
            document.getElementById('initMessage').style.display = 'none';
        }

        displayContainers();
    } catch (err) {
        console.error('Грешка:', err);
        alert('Не можа да се зареди containers.json! Провери името и пътя на файла.');
    }
}

// ============================================================
// ЧАСТ 3/6: ВИЗУАЛИЗАЦИЯ НА КАРТАТА И UI
// ============================================================

function getMarkerColor(fl) {
    if (fl < 30) return '#28a745';
    if (fl < 70) return '#ffc107';
    return '#dc3545';
}

function createMarkerIcon(cl, z) {
    const bc = z === 'north' ? '#dc3545' : '#28a745';
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color:${cl};width:24px;height:24px;border-radius:50%;border:3px solid ${bc};box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

function displayContainers() {
    mk.forEach(mr => mr.remove());
    mk = [];

    // Гаражи
    Object.values(dp).forEach(d => {
        const dc = d.zone === 'north' ? '#dc3545' : '#28a745';
        const dm = L.marker([d.lat, d.lon], {
            icon: L.divIcon({
                className: 'depot-marker',
                html: `<div style="background-color:${dc};width:35px;height:35px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:18px;">Гараж</div>`,
                iconSize: [35, 35],
                iconAnchor: [17, 17]
            })
        }).addTo(m);
        dm.bindPopup(`<b>${d.name}</b><br>Зона: ${d.zone === 'north' ? 'Север' : 'Юг'}`);
        mk.push(dm);
    });

    // Контейнери
    c.forEach(function (cn) {
        const cl = getMarkerColor(cn.fillLevel);
        const mr = L.marker([cn.lat, cn.lon], { icon: createMarkerIcon(cl, cn.zone) }).addTo(m);

        const zn = cn.zone === 'north' ? 'Север (Червен)' : 'Юг (Зелен)';
        const vol = (cn.capacity * (cn.fillLevel / 100) / 1000).toFixed(2);

        const pc = `<b>Контейнер #${cn.id}</b><br>${cn.address}<br>Зона: ${zn}<br>Запълнен: ${cn.fillLevel}%<br>Обем: ${vol} м³<br>`;
        const progress = `<div style="background:#eee;height:10px;border-radius:5px;margin-top:5px;overflow:hidden;"><div style="background:${cl};width:${cn.fillLevel}%;height:100%;"></div></div>`;

        mr.bindPopup(`${pc}${progress}<br><button onclick="window.removeContainer(${cn.id})" style="color:white;background:#dc3545;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;margin-top:8px;">Премахни</button>`);
        mk.push(mr);
    });

    updateStats();
}

function removeContainer(id) {
    c = c.filter(cn => cn.id !== id);
    displayContainers();
    console.log("Премахнат контейнер:", id);
}
window.removeContainer = removeContainer;

function updateStats() {
    const nc = c.filter(cn => cn.zone === 'north');
    const sc = c.filter(cn => cn.zone === 'south');
    const ncr = nc.filter(cn => cn.fillLevel > 70).length;
    const scr = sc.filter(cn => cn.fillLevel > 70).length;

    const sh = `<div class="zone-stats north"><b>Северна зона (Камион 1)</b><br>Контейнери: ${nc.length} | Критични: ${ncr}</div>
                <div class="zone-stats south"><b>Южна зона (Камион 2)</b><br>Контейнери: ${sc.length} | Критични: ${scr}</div>
                <div class="data-source">Данни: ${c.length} контейнера (от containers.json)</div>`;

    document.getElementById('stats').innerHTML = sh;
}

function exportContainers() {
    if (!c || c.length === 0) { alert("Няма контейнери за експортиране!"); return; }
    const ds = JSON.stringify(c, null, 2);
    const bl = new Blob([ds], { type: "application/json" });
    const u = URL.createObjectURL(bl);
    const a = document.createElement("a");
    a.href = u; a.download = "containers.json"; a.click();
    URL.revokeObjectURL(u);
}

function toggleZones() {
    if (zv) {
        if (zp.north) m.removeLayer(zp.north);
        if (zp.south) m.removeLayer(zp.south);
        zp.north = null; zp.south = null;
        document.getElementById('zoneToggleText').textContent = 'Покажи зони';
        zv = false;
    } else {
        const b = m.getBounds();
        const dl = kb.dividingLine;

        zp.north = L.polygon([[dl, b.getWest()], [b.getNorth(), b.getWest()], [b.getNorth(), b.getEast()], [dl, b.getEast()]], {
            color: '#dc3545', fillColor: '#dc3545', fillOpacity: 0.1, weight: 2, dashArray: '5, 10'
        }).addTo(m).bindPopup('<b>Северна зона</b><br>Камион 1 (Червен)');

        zp.south = L.polygon([[b.getSouth(), b.getWest()], [dl, b.getWest()], [dl, b.getEast()], [b.getSouth(), b.getEast()]], {
            color: '#28a745', fillColor: '#28a745', fillOpacity: 0.1, weight: 2, dashArray: '5, 10'
        }).addTo(m).bindPopup('<b>Южна зона</b><br>Камион 2 (Зелен)');

        document.getElementById('zoneToggleText').textContent = 'Скрий зони';
        zv = true;
    }
}
window.toggleZones = toggleZones;

// ============================================================
// ЧАСТ 4–6: РАЗСТОЯНИЯ, АЛГОРИТЪМ И МАРШРУТИ (без промяна!)
// ============================================================

function calculateDistance(p1, p2) {
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLon = (p2.lon - p1.lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function getCacheKey(p1, p2) {
    return `${p1.lat.toFixed(5)},${p1.lon.toFixed(5)}-${p2.lat.toFixed(5)},${p2.lon.toFixed(5)}`;
}

async function getRealDistanceFast(p1, p2) {
    const key = getCacheKey(p1, p2);
    if (distCache[key]) return distCache[key];
    const airDist = calculateDistance(p1, p2);
    const realDist = airDist * 1.3;
    const time = realDist / 0.5;
    const result = { distance: realDist, time: time, valid: true };
    distCache[key] = result;
    return result;
}

function categorizeContainer(fl) {
    if (fl >= 70) return 'CRITICAL';
    if (fl >= 30) return 'MEDIUM';
    if (fl >= 10) return 'LOW';
    return 'SKIP';
}

function getTruckMode(fillPct) {
    if (fillPct < 60) return 'HUNTING';
    if (fillPct < 85) return 'COLLECTING';
    return 'TOPPING_OFF';
}

function countNearbyContainers(cn, all, radius) {
    let cnt = 0;
    for (let i = 0; i < all.length && cnt < 3; i++) {
        if (all[i].id !== cn.id) {
            const d = calculateDistance(cn, all[i]);
            if (d <= radius) cnt++;
        }
    }
    return cnt;
}

function calculateFastEfficiency(cn, cr, tv, rm, distData) {
    const cat = categorizeContainer(cn.fillLevel);
    const mode = getTruckMode((tv / TRUCK_CAPACITY) * 100);
    const vol = cn.capacity * (cn.fillLevel / 100);
    const remaining = TRUCK_CAPACITY - tv;

    if (vol > remaining) return { efficiency: -Infinity };

    let dist = distData.distance;
    if (dist < 0.01) dist = 0.01;

    let pri = 1.0;
    if (cat === 'CRITICAL') pri = 3.0;
    else if (cat === 'MEDIUM') pri = 1.5;
    else if (cat === 'LOW') pri = 0.5;
    else return { efficiency: -Infinity };

    let baseEff = (pri * vol) / dist;
    let bonus = 0;

    if (mode === 'HUNTING') {
        if (cat === 'CRITICAL') bonus += vol * 2;
        else if (cat === 'MEDIUM') bonus += vol * 0.5;
        if (vol < 200) bonus -= 500;
    } else if (mode === 'COLLECTING') {
        if (cat === 'CRITICAL') bonus += vol * 1.5;
        else if (cat === 'MEDIUM' && vol > 300) bonus += vol * 0.8;
        if (dist < 0.3) bonus += 300;
    } else if (mode === 'TOPPING_OFF') {
        if (vol <= remaining && vol > remaining * 0.5) bonus += vol * 3;
        if (dist < 0.2) bonus += 500;
        if (cat === 'LOW' && dist < 0.3) bonus += vol * 2;
    }

    if (dist < 0.3) {
        const nearby = countNearbyContainers(cn, rm, 0.5);
        if (nearby >= 2) bonus += nearby * 100;
    }

    return {
        efficiency: baseEff + bonus,
        distance: dist,
        time: distData.time || 0,
        volume: vol,
        category: cat,
        mode: mode
    };
}

async function getFastContextRoute(cc, d) {
    console.log('ULTRA-БЪРЗ Dynamic Context-Aware Алгоритъм...');
    console.log(`Налични контейнери: ${cc.length}`);

    const rt = [d];
    const rm = [...cc];
    let cr = d;
    let td = 0, tt = 0, tv = 0, step = 0;

    // Предварително кеширане на разстоянията
    const distMatrix = {};
    for (let i = 0; i < cc.length; i++) {
        for (let j = 0; j < cc.length; j++) {
            if (i !== j) {
                const key = getCacheKey(cc[i], cc[j]);
                if (!distCache[key]) distCache[key] = await getRealDistanceFast(cc[i], cc[j]);
            }
        }
    }
    for (let i = 0; i < rm.length; i++) {
        const key = getCacheKey(cr, rm[i]);
        distMatrix[key] = await getRealDistanceFast(cr, rm[i]);
    }

    const rmSet = new Set(rm.map(x => x.id));

    while (rmSet.size > 0 && tv < TRUCK_CAPACITY) {
        step++;
        const fillPct = (tv / TRUCK_CAPACITY) * 100;
        if (fillPct >= MIN_FILL_TARGET * 100) {
            const nearDepot = rm.filter(x => rmSet.has(x.id) && distMatrix[getCacheKey(cr, x)]?.distance < 0.5);
            if (nearDepot.length === 0) break;
        }

        const mode = getTruckMode(fillPct);
        let bestContainer = null, bestEff = -Infinity, bestData = null;

        let candidates = rm.filter(x => rmSet.has(x.id));
        if (mode === 'TOPPING_OFF') {
            const remaining = TRUCK_CAPACITY - tv;
            candidates = candidates.filter(x => {
                const vol = x.capacity * (x.fillLevel / 100);
                return vol <= remaining && vol > remaining * 0.3;
            });
        }

        for (const cand of candidates) {
            const key = getCacheKey(cr, cand);
            const distData = distMatrix[key];
            if (!distData) continue;
            const eff = calculateFastEfficiency(cand, cr, tv, rm, distData);
            if (eff.efficiency > bestEff) {
                bestEff = eff.efficiency;
                bestContainer = cand;
                bestData = eff;
            }
        }

        if (!bestContainer || bestEff === -Infinity) break;

        rt.push(bestContainer);
        td += bestData.distance;
        tt += bestData.time;
        tv += bestData.volume;
        rmSet.delete(bestContainer.id);
        cr = bestContainer;

        // Обновяване на матрицата за новия текущ контейнер
        for (const r of rm) {
            if (rmSet.has(r.id)) {
                const newKey = getCacheKey(cr, r);
                if (!distCache[newKey]) distCache[newKey] = await getRealDistanceFast(cr, r);
                distMatrix[newKey] = distCache[newKey];
            }
        }

        if (fillPct >= 95) break;
    }

    const returnDist = await getRealDistanceFast(cr, d);
    rt.push(d);
    td += returnDist.distance;
    tt += returnDist.time || 0;

    const fillPct = (tv / TRUCK_CAPACITY * 100).toFixed(1);

    console.log(`Маршрут готов! Стъпки: ${step} | Разстояние: ${td.toFixed(2)} km | Време: ${tt.toFixed(1)} min | Запълване: ${fillPct}%`);

    return {
        route: rt,
        totalDistance: td,
        totalTime: tt,
        totalVolume: tv,
        fillPercent: parseFloat(fillPct),
        containersCount: rt.length - 2
    };
}

// ============================================================
// ГЕНЕРИРАНЕ И ВИЗУАЛИЗАЦИЯ НА МАРШРУТИ (без промяна)
// ============================================================

async function generateRoute(z) {
    if (z === 'both') {
        await generateRoute('north');
        setTimeout(() => generateRoute('south'), 500);
        return;
    }

    if (rc[z]) { m.removeControl(rc[z]); rc[z] = null; }
    rm[z].forEach(mr => mr.remove()); rm[z] = [];

    const cc = c.filter(cn => cn.zone === z);
    if (cc.length === 0) { alert(`Няма контейнери в ${z === 'north' ? 'северната' : 'южната'} зона!`); return; }

    const btnId = z === 'north' ? 'routeBtnNorth' : 'routeBtnSouth';
    const btn = document.getElementById(btnId);
    btn.disabled = true;
    btn.innerHTML = '<span class="loading">Бърза оптимизация...</span>';

    const depot = dp[z];
    const start = Date.now();
    const result = await getFastContextRoute(cc, depot);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    const waypoints = result.route.map(p => L.latLng(p.lat, p.lon));
    const color = z === 'north' ? '#dc3545' : '#28a745';

    rc[z] = L.Routing.control({
        waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false,
        showAlternatives: false,
        lineOptions: { styles: [{ color, opacity: 0.7, weight: 4 }] },
        createMarker: () => null
    }).addTo(m);

    rc[z].on('routesfound', function (e) {
        var tdk = or.totalDistance.toFixed(2);
        var ttm = or.totalTime.toFixed(1);
        var tth = (or.totalTime / 60).toFixed(2);
        var tvol = (or.totalVolume / 1000).toFixed(1);
        var tfill = or.fillPercent;
        var cir = or.containersCount;

        console.log(`📏 ========== Маршрут ${z.toUpperCase()} ==========`);
        console.log(`   ⚡ Бърз Context-Aware Algorithm (${elapsed}s)`);
        console.log(`   🛣️  Разстояние: ${tdk} km`);
        console.log(`   ⏱️  Време: ${ttm} min`);
        console.log(`   📦 Капацитет: ${tvol}/${TRUCK_CAPACITY / 1000}м³ (${tfill}%)`);
        console.log(`   🗑️  Контейнери: ${cir}`);
        console.log('================================================');

        // Добавяне на маркери за спирките
        ort.forEach(function (p, ix) {
            if (p.id !== d.id) {
                var cat = categorizeContainer(p.fillLevel);
                var catColor = cat === 'CRITICAL' ? '#dc3545' :
                    cat === 'MEDIUM' ? '#ffc107' :
                        cat === 'LOW' ? '#28a745' : '#999';

                var mr = L.marker([p.lat, p.lon], {
                    icon: L.divIcon({
                        className: 'route-number',
                        html: `<div style="background:${rcl};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:3px solid ${catColor};box-shadow:0 3px 8px rgba(0,0,0,0.4);">${ix}</div>`,
                        iconSize: [28, 28],
                        iconAnchor: [14, 14]
                    }),
                    zIndexOffset: 1000
                }).addTo(m);

                var pvol = (p.capacity * (p.fillLevel / 100) / 1000).toFixed(2);
                mr.bindPopup(`<b>🚛 Спирка #${ix}</b><br>Контейнер: <b>#${p.id}</b><br>Категория: <b>${cat}</b><br>Запълнен: <b>${p.fillLevel}%</b><br>Обем: <b>${pvol}м³</b><br>Адрес: ${p.address}`);
                rm[z].push(mr);
            }
        });

        // Инфо панел
        var zn = z === 'north' ? 'Северна' : 'Южна';
        var capColor = tfill >= 90 ? '#28a745' : tfill >= 75 ? '#ffc107' : '#dc3545';

        var rih = `<div style="position:absolute;${z === 'north' ? 'top:10px;' : 'top:320px;'}left:10px;z-index:1000;background:white;padding:15px 20px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.3);border-left:5px solid ${rcl};min-width:320px;max-width:360px;font-family:Arial,sans-serif;" id="routeInfo${z}">
            <h4 style="margin:0 0 12px 0;color:${rcl};font-size:16px;">
                ${z === 'north' ? '🔴' : '🟢'} ${zn} зона 
                <span style="background:linear-gradient(135deg,#f093fb,#f5576c);color:white;padding:2px 8px;border-radius:10px;font-size:10px;margin-left:5px;">⚡ ${elapsed}s</span>
            </h4>
            <div style="font-size:14px;line-height:1.8;color:#333;">
                <div style="margin-bottom:8px;"><strong>🛣️ Разстояние:</strong> <span style="color:${rcl};font-weight:bold;">${tdk} km</span></div>
                <div style="margin-bottom:8px;"><strong>⏱️ Време:</strong> <span style="color:${rcl};font-weight:bold;">${ttm} min</span></div>
                <div style="margin-bottom:8px;"><strong>📦 Капацитет:</strong> <span style="color:${capColor};font-weight:bold;">${tvol}/15м³ (${tfill}%)</span></div>
                <div style="background:#eee;height:12px;border-radius:6px;overflow:hidden;margin-bottom:8px;">
                    <div style="background:${capColor};width:${tfill}%;height:100%;transition:width 0.3s;"></div>
                </div>
                <div style="margin-bottom:8px;"><strong>🗑️ Контейнери:</strong> <span style="color:${rcl};font-weight:bold;">${cir}</span></div>
                <div><strong>💰 Ефективност:</strong> <span style="color:${rcl};font-weight:bold;">${(cir / or.totalDistance).toFixed(1)} bins/km</span></div>
                <div style="margin-top:10px;padding-top:10px;border-top:1px solid #eee;font-size:11px;color:#666;">
                    ⚡ Ultra-бърз AI алгоритъм<br>
                    🎯 HUNTING→COLLECTING→TOPPING_OFF<br>
                    ✓ Всички категории контейнери
                </div>
            </div>
        </div>`;

        var oi = document.getElementById('routeInfo' + z);
        if (oi) oi.remove();
        document.getElementById('map').insertAdjacentHTML('beforeend', rih);

        var perfMsg = tfill >= 90 ? '🏆 ОТЛИЧЕН резултат!' :
            tfill >= 75 ? '✅ Добър резултат' :
                tfill >= 60 ? '⚠️ Среден резултат' : '❌ Нисък резултат';

        alert(`${perfMsg}\n\nМаршрут ${zn} зона:\n\n⚡ Ultra-бърз AI (${elapsed}s)\n🛣️ Разстояние: ${tdk} km\n⏱️ Време: ${ttm} min (${tth} h)\n📦 Капацитет: ${tvol}/15м³ (${tfill}%)\n🗑️ Контейнери: ${cir} (всички категории)\n💰 Ефективност: ${(cir / or.totalDistance).toFixed(1)} bins/km\n\n✓ Минава през CRITICAL, MEDIUM и LOW!`);

        bt.disabled = false;
        bt.innerHTML = z === 'north' ? '🚛 Север' : '🚛 Юг';
    });

    rc[z].on('routingerror', e => {
        console.error('Грешка при маршрута:', e);
        alert('Грешка при визуализация на маршрута!');
        btn.disabled = false;
        btn.innerHTML = z === 'north' ? 'Север' : 'Юг';
    });
}
window.generateRoute = generateRoute;

function clearRoute() {
    ['north', 'south'].forEach(z => {
        if (rc[z]) { m.removeControl(rc[z]); rc[z] = null; }
        rm[z].forEach(mr => mr.remove()); rm[z] = [];
        const info = document.getElementById('routeInfo' + z);
        if (info) info.remove();
    });
}
window.clearRoute = clearRoute;