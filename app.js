// Data structures from Python file
const datasets = {
    "Horizontal": {
        "r": [20, 25, 30, 35, 40, 45, 50, 54],
        "fck": [10, 17, 25, 33.7, 42.5, 52, 62, 70]
    },
    "Vertical Downward": {
        "r": [20, 25, 30, 35, 40, 45, 52],
        "fck": [15, 22, 30, 39, 48, 58, 70]
    },
    "Vertical Upward": {
        "r": [25, 30, 35, 40, 45, 50, 55],
        "fck": [10, 17, 25.5, 32, 43.5, 53.5, 64]
    }
};

const k1_table = {
    9: 1.67, 10: 1.62, 11: 1.58, 12: 1.55,
    13: 1.52, 14: 1.50, 15: 1.48
};

class RecoilHammerApp {
    constructor() {
        this.currentTestType = "Horizontal";
        this.inputFields = [];
        this.storageKey = 'recoilHammerTests';
        this.init();
    }

    init() {
        this.createUI();
        this.setupEventListeners();
        this.loadProjects();
        this.checkForSharedProject();
    }

    createUI() {
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="controls-panel">
                <div class="logo-section">
                    <a href="http://www.tommerdal.no" target="_blank" class="logo-button">
                        <img src="assets/LogoTC.png" alt="Tømmerdal Consult" class="logo-image">
                    </a>
                    <div class="credits">Developed by Tømmerdal Consult AS</div>
                </div>
                
                <h1>Proceq Recoil Hammer Test Processor</h1>
                
                <div class="project-location-section">
                    <h2>Test Information</h2>
                    <div class="field-group">
                        <label for="project">Project</label>
                        <input type="text" class="project-field" id="project" list="project-datalist" placeholder="Enter or select project name">
                        <datalist id="project-datalist"></datalist>
                    </div>
                    <div class="field-group">
                        <label for="test-location">Test Location</label>
                        <div class="location-input-wrapper">
                            <input type="text" class="test-location-field" id="test-location" list="location-datalist" placeholder="Enter or select test location">
                            <button type="button" class="clear-btn-small" id="clear-location-btn" title="Clear location">×</button>
                            <datalist id="location-datalist"></datalist>
                        </div>
                    </div>
                    
                    <div class="save-buttons">
                        <button class="btn btn-secondary btn-small" id="save-btn">Save Test</button>
                        <button class="btn btn-secondary btn-small" id="delete-btn">Delete Test</button>
                    </div>
                    <div class="privacy-notice">
                        <span class="privacy-icon">🔒</span>
                        Tests are saved locally on your computer
                    </div>
                </div>
                
                <div class="dataset-section">
                    <h2>Reference Dataset</h2>
                    <div class="dataset-display">
                        <span class="dataset-name">Proceq Original Schmidt</span>
                        <span class="dataset-description">(Standard Proceq Schmidt Hammer R-fck_cube150-curves)</span>
                    </div>
                </div>

                <div class="test-type-section">
                    <h2>Test Orientation</h2>
                    <div class="radio-group">
                        ${Object.keys(datasets).map(type => `
                            <div class="radio-option">
                                <input type="radio" id="${type.replace(/\s+/g, '')}" name="testType" value="${type}" ${type === 'Horizontal' ? 'checked' : ''}>
                                <label for="${type.replace(/\s+/g, '')}">${type}</label>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="input-section">
                    <h2>R-Values (9-20 values)</h2>
                    <div class="paste-hint">Paste values from Excel (Ctrl+V) - comma, tab or line separated</div>
                    <div class="input-grid" id="input-grid">
                        ${Array.from({length: 20}, (_, i) => `
                            <input type="number" class="input-field" placeholder="R${i+1}" step="0.01">
                        `).join('')}
                    </div>
                </div>

                <div class="buttons">
                    <button class="btn btn-primary" id="calculate-btn">Calculate fck</button>
                    <button class="btn btn-secondary" id="clear-btn">Clear</button>
                </div>

                <div class="export-section">
                    <div class="export-buttons">
                        <button class="btn btn-secondary" id="export-btn">Export Project Tests</button>
                        <input type="file" id="import-file" accept=".json" style="display: none;">
                        <button class="btn btn-secondary" id="import-btn">Import Test Data</button>
                        <button class="btn btn-secondary" id="share-btn">Share Project</button>
                        <button class="btn btn-secondary" id="share-test-btn">Share Test</button>
                    </div>
                </div>

            </div>

            <div class="chart-panel">
                <h2 class="chart-title">Reference Curve and Test Points</h2>
                <div id="chart-container"></div>
                
                <div class="results-section">
                    <h2>Results</h2>
                    <div class="results-display" id="results"></div>
                </div>
            </div>
        `;

        this.inputFields = document.querySelectorAll('.input-field');
    }

    setupEventListeners() {
        // Test type selection
        document.querySelectorAll('input[name="testType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentTestType = e.target.value;
                // Redraw chart to show the selected curve highlighted
                this.redrawChart();
            });
        });

        // Calculate button
        document.getElementById('calculate-btn').addEventListener('click', () => {
            this.calculate();
        });

        // Clear button
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearInputs();
        });

        // Save button
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveCurrentTest();
        });

        // Delete button
        document.getElementById('delete-btn').addEventListener('click', () => {
            this.deleteSelectedTest();
        });


        // Export button
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportProjectTests();
        });

        // Import button
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });

        // Import file handler
        document.getElementById('import-file').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importTestData(e.target.files[0]);
            }
        });

        // Share project button
        document.getElementById('share-btn').addEventListener('click', () => {
            this.shareProject();
        });

        // Share test button
        document.getElementById('share-test-btn').addEventListener('click', () => {
            this.shareTest();
        });

        // Project field change handler
        document.getElementById('project').addEventListener('input', (e) => {
            this.onProjectFieldChange(e.target.value);
        });

        // Test location field change handler
        document.getElementById('test-location').addEventListener('input', (e) => {
            this.onLocationFieldChange();
        });

        // Clear location button
        document.getElementById('clear-location-btn').addEventListener('click', (e) => {
            document.getElementById('test-location').value = '';
            document.getElementById('test-location').focus();
            this.updateLocationDatalist();
        });

        // Paste functionality for each input field
        this.inputFields.forEach((input, index) => {
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                this.handlePaste(e, index);
            });
        });

        // Also handle paste on the input grid container
        document.getElementById('input-grid').addEventListener('paste', (e) => {
            e.preventDefault();
            this.handlePaste(e, 0);
        });
    }

    handlePaste(e, startIndex) {
        const pastedData = e.clipboardData.getData('text');
        const values = this.parseValues(pastedData);
        
        values.forEach((value, i) => {
            const inputIndex = startIndex + i;
            if (inputIndex < this.inputFields.length && value !== '') {
                this.inputFields[inputIndex].value = value;
            }
        });
    }

    parseValues(data) {
        // Handle comma, tab, or line separated values
        return data.trim()
            .split(/[,\t\n\r]+/)
            .map(val => val.trim())
            .filter(val => val !== '' && !isNaN(parseFloat(val)))
            .map(val => parseFloat(val));
    }

    interpolate(x, xs, ys) {
        for (let i = 0; i < xs.length - 1; i++) {
            if (xs[i] <= x && x <= xs[i + 1]) {
                const x0 = xs[i], x1 = xs[i + 1];
                const y0 = ys[i], y1 = ys[i + 1];
                return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
            }
        }
        return null;
    }

    getK1(n) {
        if (n < 9) return null;
        return k1_table[n] || 1.48; // Use 1.48 for n > 15
    }

    calculate() {
        const dataset = datasets[this.currentTestType];
        const xs = dataset.r;
        const ys = dataset.fck;
        
        const rValues = [];
        const fckCube = [];
        const fckCylinder = [];

        // Collect valid inputs
        this.inputFields.forEach(input => {
            const val = parseFloat(input.value);
            if (!isNaN(val)) {
                const fck = this.interpolate(val, xs, ys);
                if (fck !== null) {
                    rValues.push(val);
                    fckCube.push(fck);
                    fckCylinder.push(fck / 1.25);
                }
            }
        });

        const n = fckCylinder.length;
        const resultsDiv = document.getElementById('results');

        if (n < 9) {
            resultsDiv.textContent = "Error: At least 9 test values are required.";
            resultsDiv.className = "results-display error";
            return;
        }

        resultsDiv.className = "results-display";

        // Calculate statistics
        const meanCylinder = fckCylinder.reduce((a, b) => a + b, 0) / n;
        const variance = fckCylinder.reduce((sum, val) => sum + Math.pow(val - meanCylinder, 2), 0) / (n - 1);
        const stdCylinder = Math.sqrt(variance);
        const minCylinder = Math.min(...fckCylinder);
        const k1 = this.getK1(n);

        const fckIs1 = meanCylinder - k1 * stdCylinder;
        const fckIs2 = minCylinder + 4;
        const fckIs = Math.min(fckIs1, fckIs2);

        // Display results
        const project = document.getElementById('project').value.trim();
        const testLocation = document.getElementById('test-location').value.trim();
        let results = '';
        
        if (project || testLocation) {
            if (project) results += `Project: ${project}\n`;
            if (testLocation) results += `Location: ${testLocation}\n`;
            results += `Test Type: ${this.currentTestType}\n\n`;
        }
        
        results += `${'R'.padStart(8)} ${'fck_cube150'.padStart(12)} ${'fck_cylinder'.padStart(14)}\n`;
        
        rValues.forEach((r, i) => {
            results += `${r.toFixed(2).padStart(8)} ${fckCube[i].toFixed(2).padStart(12)} ${fckCylinder[i].toFixed(2).padStart(14)}\n`;
        });

        results += `\n`;
        results += `n = ${n}\n`;
        results += `k1 = ${k1}\n`;
        results += `mean = ${meanCylinder.toFixed(2)}\n`;
        results += `std dev = ${stdCylinder.toFixed(2)}\n`;
        results += `fck_is1 = ${fckIs1.toFixed(2)}\n`;
        results += `fck_is2 = ${fckIs2.toFixed(2)}\n`;
        results += `→ Final fck_is = ${fckIs.toFixed(2)}\n`;

        resultsDiv.textContent = results;

        // Create chart
        this.createChart(xs, ys, rValues, fckCube);
    }

    createChart(refR, refFck, testR, testFck) {
        const container = document.getElementById('chart-container');
        container.innerHTML = '';

        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        const svg = d3.select('#chart-container')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales - include all datasets for proper scaling
        const allRValues = [];
        const allFckValues = [];
        
        // Add all reference curves
        Object.values(datasets).forEach(dataset => {
            allRValues.push(...dataset.r);
            allFckValues.push(...dataset.fck);
        });
        
        // Add test data
        allRValues.push(...testR);
        allFckValues.push(...testFck);
        
        const xScale = d3.scaleLinear()
            .domain(d3.extent(allRValues))
            .range([0, width])
            .nice();

        const yScale = d3.scaleLinear()
            .domain(d3.extent(allFckValues))
            .range([height, 0])
            .nice();

        // Grid
        g.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale)
                .tickSize(-height)
                .tickFormat('')
            );

        g.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat('')
            );

        // Axes
        g.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(yScale));

        // Axis labels
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left)
            .attr('x', 0 - (height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .style('fill', '#ffffff')
            .text('fck cube 150 (MPa)');

        g.append('text')
            .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
            .style('text-anchor', 'middle')
            .style('fill', '#ffffff')
            .text('R-value');

        // Line generator
        const line = d3.line()
            .x(d => xScale(d.r))
            .y(d => yScale(d.fck));

        // Define colors for each test type
        const curveColors = {
            "Horizontal": "#FF9800",        // orange
            "Vertical Downward": "#1565C0", // dark blue
            "Vertical Upward": "#9C27B0"    // purple
        };

        // Draw all three curves
        Object.keys(datasets).forEach(testType => {
            const dataset = datasets[testType];
            const curveData = dataset.r.map((r, i) => ({ r, fck: dataset.fck[i] }));
            const isSelected = testType === this.currentTestType;
            const baseColor = curveColors[testType];
            const strokeColor = isSelected ? '#4CAF50' : baseColor;
            const fillColor = isSelected ? '#4CAF50' : baseColor;
            
            // Curve line
            g.append('path')
                .datum(curveData)
                .attr('class', isSelected ? 'reference-line' : 'inactive-reference-line')
                .attr('d', line)
                .style('stroke', strokeColor)
                .style('stroke-width', isSelected ? 3 : 1)
                .style('opacity', isSelected ? 1 : 0.25)
                .style('fill', 'none'); // Ensure no fill to avoid black shaded areas

            // Curve points
            g.selectAll(`.reference-points-${testType.replace(/\s+/g, '-')}`)
                .data(curveData)
                .enter().append('circle')
                .attr('class', isSelected ? 'reference-points' : 'inactive-reference-points')
                .attr('cx', d => xScale(d.r))
                .attr('cy', d => yScale(d.fck))
                .attr('r', isSelected ? 5 : 2)
                .style('fill', fillColor)
                .style('stroke', '#ffffff')
                .style('stroke-width', isSelected ? 2 : 0.5)
                .style('opacity', isSelected ? 1 : 0.3);
        });

        // Add legend in upper left corner
        const legend = g.append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(10, 20)');

        Object.keys(datasets).forEach((testType, i) => {
            const isSelected = testType === this.currentTestType;
            const baseColor = curveColors[testType];
            const legendColor = isSelected ? '#4CAF50' : baseColor;
            const legendY = i * 20;

            // Legend line
            legend.append('line')
                .attr('x1', 0)
                .attr('x2', 20)
                .attr('y1', legendY)
                .attr('y2', legendY)
                .style('stroke', legendColor)
                .style('stroke-width', isSelected ? 3 : 2)
                .style('opacity', isSelected ? 1 : 0.4);

            // Legend circle
            legend.append('circle')
                .attr('cx', 10)
                .attr('cy', legendY)
                .attr('r', isSelected ? 4 : 2)
                .style('fill', legendColor)
                .style('stroke', '#ffffff')
                .style('stroke-width', isSelected ? 1 : 0.5)
                .style('opacity', isSelected ? 1 : 0.4);

            // Legend text
            legend.append('text')
                .attr('x', 25)
                .attr('y', legendY)
                .attr('dy', '0.35em')
                .style('font-size', isSelected ? '13px' : '12px')
                .style('fill', isSelected ? '#4CAF50' : '#ffffff')
                .style('font-weight', isSelected ? 'bold' : 'normal')
                .style('opacity', isSelected ? 1 : 0.7)
                .text(testType + (isSelected ? ' (Selected)' : ''));
        });

        // Tooltip
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        // Test points with grouping for same R-values
        const testData = testR.map((r, i) => ({ r, fck: testFck[i] }));
        const groupedData = d3.group(testData, d => d.r);
        
        const testPoints = Array.from(groupedData, ([r, points]) => ({
            r,
            points,
            avgFck: d3.mean(points, d => d.fck),
            count: points.length
        }));

        g.selectAll('.test-points')
            .data(testPoints)
            .enter().append('circle')
            .attr('class', 'test-points')
            .attr('cx', d => xScale(d.r))
            .attr('cy', d => yScale(d.avgFck))
            .attr('r', d => Math.max(6, Math.min(12, 6 + d.count)))
            .on('mouseover', function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                
                let tooltipText = `R-value: ${d.r}\n`;
                if (d.count === 1) {
                    tooltipText += `fck_cube: ${d.points[0].fck.toFixed(2)} MPa`;
                } else {
                    tooltipText += `Count: ${d.count} points\n`;
                    tooltipText += `Average fck_cube: ${d.avgFck.toFixed(2)} MPa\n`;
                    tooltipText += `Values: ${d.points.map(p => p.fck.toFixed(2)).join(', ')} MPa`;
                }
                
                tooltip.html(tooltipText.replace(/\n/g, '<br>'))
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function(d) {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });
    }

    redrawChart() {
        // Get current R-values from input fields
        const rValues = [];
        const testFck = [];
        
        // Get current dataset
        const xs = datasets[this.currentTestType]["r"];
        const ys = datasets[this.currentTestType]["fck"];
        
        this.inputFields.forEach(input => {
            const val = input.value.trim();
            if (val) {
                try {
                    const r = parseFloat(val);
                    const fck = this.interpolate(r, xs, ys);
                    if (fck !== null) {
                        rValues.push(r);
                        testFck.push(fck);
                    }
                } catch (e) {
                    // Skip invalid values
                }
            }
        });
        
        // Redraw chart with current data
        this.createChart(xs, ys, rValues, testFck);
    }

    clearInputs() {
        this.inputFields.forEach(input => {
            input.value = '';
        });
        document.getElementById('project').value = '';
        document.getElementById('test-location').value = '';
        document.getElementById('results').textContent = '';
        document.getElementById('chart-container').innerHTML = '';
    }

    getSavedTests() {
        const saved = localStorage.getItem(this.storageKey);
        return saved ? JSON.parse(saved) : [];
    }

    saveTestToStorage(tests) {
        localStorage.setItem(this.storageKey, JSON.stringify(tests));
    }

    generateTestId() {
        return 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getCurrentTestData() {
        const project = document.getElementById('project').value.trim();
        const location = document.getElementById('test-location').value.trim();
        const rValues = [];
        
        this.inputFields.forEach(input => {
            const val = parseFloat(input.value);
            if (!isNaN(val)) {
                rValues.push(val);
            }
        });

        return {
            project,
            location,
            testType: this.currentTestType,
            rValues,
            timestamp: new Date().toISOString()
        };
    }

    saveCurrentTest() {
        const testData = this.getCurrentTestData();
        
        if (!testData.project && !testData.location) {
            alert('Please enter at least a project name or test location before saving.');
            return;
        }

        if (testData.rValues.length === 0) {
            alert('Please enter some R-values before saving.');
            return;
        }

        const tests = this.getSavedTests();
        
        // Check if a test with the same project and location already exists
        const existingTestIndex = tests.findIndex(test => 
            test.project === testData.project && test.location === testData.location
        );

        if (existingTestIndex !== -1) {
            // Test location already exists - ask user what to do
            const existingTest = tests[existingTestIndex];
            const existingDate = new Date(existingTest.timestamp).toLocaleDateString();
            const existingTime = new Date(existingTest.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            const choice = confirm(
                `A test already exists for:\n` +
                `Project: ${testData.project}\n` +
                `Location: ${testData.location}\n` +
                `Saved: ${existingDate} ${existingTime}\n\n` +
                `Click OK to overwrite the existing test\n` +
                `Click Cancel to save with a different name`
            );

            if (choice) {
                // User wants to overwrite - replace existing test
                const testId = existingTest.id; // Keep the same ID
                const displayName = this.generateDisplayName(testData);
                
                tests[existingTestIndex] = {
                    id: testId,
                    displayName,
                    ...testData
                };
                
                this.saveTestToStorage(tests);
                this.loadProjects();
                alert('Test overwritten successfully!');
            } else {
                // User wants to save with different name
                this.saveWithDifferentName(testData, tests);
            }
        } else {
            // No existing test - save normally
            const testId = this.generateTestId();
            const displayName = this.generateDisplayName(testData);
            
            tests.push({
                id: testId,
                displayName,
                ...testData
            });

            this.saveTestToStorage(tests);
            this.loadProjects();
            alert('Test saved successfully!');
        }
    }

    saveWithDifferentName(testData, tests) {
        const newLocation = prompt(
            `Please enter a different test location:\n` +
            `Current: ${testData.location}`,
            testData.location + ' - Copy'
        );

        if (newLocation && newLocation.trim() !== '') {
            const newTestData = { ...testData, location: newLocation.trim() };
            
            // Check if the new location also exists
            const stillExists = tests.some(test => 
                test.project === newTestData.project && test.location === newTestData.location
            );

            if (stillExists) {
                alert('That location name is also already used. Please try saving again with a different location.');
                return;
            }

            // Save with new location
            const testId = this.generateTestId();
            const displayName = this.generateDisplayName(newTestData);
            
            tests.push({
                id: testId,
                displayName,
                ...newTestData
            });

            this.saveTestToStorage(tests);
            this.loadProjects();
            
            // Update the UI to show the new location
            document.getElementById('test-location').value = newTestData.location;
            
            alert('Test saved with new location successfully!');
        }
    }

    generateDisplayName(testData) {
        const date = new Date(testData.timestamp).toLocaleDateString();
        const time = new Date(testData.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        let name = '';
        if (testData.project) name += testData.project;
        if (testData.location) {
            if (name) name += ' - ';
            name += testData.location;
        }
        if (name) name += ` (${date} ${time})`;
        else name = `Test ${date} ${time}`;
        
        return name;
    }

    loadProjects() {
        const tests = this.getSavedTests();
        const projects = [...new Set(tests.map(test => test.project).filter(p => p))];
        
        // Update project datalist for autocomplete
        const projectDatalist = document.getElementById('project-datalist');
        projectDatalist.innerHTML = '';
        
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            projectDatalist.appendChild(option);
        });
        
        // Update location datalist based on current project
        this.updateLocationDatalist();
    }

    updateLocationDatalist() {
        const currentProject = document.getElementById('project').value.trim();
        const tests = this.getSavedTests();
        
        let locations;
        if (currentProject) {
            // Show only locations from the current project
            locations = [...new Set(
                tests
                    .filter(test => test.project === currentProject)
                    .map(test => test.location)
                    .filter(l => l)
            )];
        } else {
            // Show all locations if no project is selected
            locations = [...new Set(tests.map(test => test.location).filter(l => l))];
        }
        
        const locationDatalist = document.getElementById('location-datalist');
        locationDatalist.innerHTML = '';
        
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            locationDatalist.appendChild(option);
        });
    }


    loadTest(testId) {
        const tests = this.getSavedTests();
        const test = tests.find(t => t.id === testId);
        
        if (!test) return;

        // Load project and location
        document.getElementById('project').value = test.project || '';
        document.getElementById('test-location').value = test.location || '';
        
        // Load test type
        this.currentTestType = test.testType;
        document.querySelector(`input[value="${test.testType}"]`).checked = true;
        
        // Clear all inputs first
        this.inputFields.forEach(input => input.value = '');
        
        // Load R-values
        test.rValues.forEach((value, index) => {
            if (index < this.inputFields.length) {
                this.inputFields[index].value = value;
            }
        });
        
        // Clear results and chart
        document.getElementById('results').textContent = '';
        document.getElementById('chart-container').innerHTML = '';
    }


    deleteSelectedTest() {
        // Since we don't have dropdowns anymore, we need to find tests that match current form data
        const project = document.getElementById('project').value.trim();
        const location = document.getElementById('test-location').value.trim();
        
        if (!project && !location) {
            alert('Please enter project and/or location information to identify which test to delete.');
            return;
        }

        const tests = this.getSavedTests();
        const matchingTests = tests.filter(test => 
            (project === '' || test.project === project) &&
            (location === '' || test.location === location)
        );

        if (matchingTests.length === 0) {
            alert('No saved tests found matching the current project/location.');
            return;
        }

        if (matchingTests.length === 1) {
            const testToDelete = matchingTests[0];
            if (!confirm(`Are you sure you want to delete the test from "${testToDelete.project}" - "${testToDelete.location}"?`)) {
                return;
            }
            
            const filteredTests = tests.filter(test => test.id !== testToDelete.id);
            this.saveTestToStorage(filteredTests);
            this.loadProjects();
            this.clearInputs();
            alert('Test deleted successfully!');
        } else {
            alert(`Found ${matchingTests.length} tests matching these criteria. Please be more specific with project and location.`);
        }
    }

    exportProjectTests() {
        const selectedProject = document.getElementById('project').value.trim();
        
        if (!selectedProject) {
            alert('Please select a project to export.');
            return;
        }

        const tests = this.getSavedTests();
        const projectTests = tests.filter(test => test.project === selectedProject);
        
        if (projectTests.length === 0) {
            alert('No tests found for the selected project.');
            return;
        }

        // Enhance tests with calculated results if they exist
        const enhancedTests = projectTests.map(test => {
            const enhancedTest = { ...test };
            
            // Try to calculate results for this test
            try {
                const dataset = datasets[test.testType];
                const xs = dataset.r;
                const ys = dataset.fck;
                
                const rValues = test.rValues;
                const fckCube = [];
                const fckCylinder = [];

                rValues.forEach(r => {
                    const fck = this.interpolate(r, xs, ys);
                    if (fck !== null) {
                        fckCube.push(fck);
                        fckCylinder.push(fck / 1.25);
                    }
                });

                if (fckCylinder.length >= 9) {
                    const n = fckCylinder.length;
                    const meanCylinder = fckCylinder.reduce((a, b) => a + b, 0) / n;
                    const variance = fckCylinder.reduce((sum, val) => sum + Math.pow(val - meanCylinder, 2), 0) / (n - 1);
                    const stdCylinder = Math.sqrt(variance);
                    const minCylinder = Math.min(...fckCylinder);
                    const k1 = this.getK1(n);

                    const fckIs1 = meanCylinder - k1 * stdCylinder;
                    const fckIs2 = minCylinder + 4;
                    const fckIs = Math.min(fckIs1, fckIs2);

                    enhancedTest.calculatedResults = {
                        fckCube,
                        fckCylinder,
                        statistics: {
                            n,
                            k1,
                            mean: meanCylinder,
                            stdDev: stdCylinder,
                            min: minCylinder,
                            fckIs1,
                            fckIs2,
                            finalFckIs: fckIs
                        }
                    };
                }
            } catch (error) {
                // If calculation fails, just export without results
            }

            return enhancedTest;
        });

        const exportData = {
            projectName: selectedProject,
            exportDate: new Date().toISOString(),
            testCount: enhancedTests.length,
            tests: enhancedTests
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedProject.replace(/[^a-zA-Z0-9]/g, '_')}_tests_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`Exported ${enhancedTests.length} tests from project "${selectedProject}".`);
    }

    importTestData(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (!importData.tests || !Array.isArray(importData.tests)) {
                    throw new Error('Invalid file format: missing tests array');
                }

                const existingTests = this.getSavedTests();
                let importedCount = 0;
                let skippedCount = 0;

                importData.tests.forEach(importTest => {
                    // Validate required fields
                    if (!importTest.project || !importTest.rValues || !Array.isArray(importTest.rValues)) {
                        skippedCount++;
                        return;
                    }

                    // Check if test already exists (same project, location, testType, and rValues)
                    const duplicate = existingTests.find(existing => 
                        existing.project === importTest.project &&
                        existing.location === importTest.location &&
                        existing.testType === importTest.testType &&
                        JSON.stringify(existing.rValues) === JSON.stringify(importTest.rValues)
                    );

                    if (duplicate) {
                        skippedCount++;
                        return;
                    }

                    // Create new test with fresh ID and timestamp
                    const newTest = {
                        id: this.generateTestId(),
                        displayName: this.generateDisplayName({
                            project: importTest.project,
                            location: importTest.location,
                            timestamp: new Date().toISOString()
                        }),
                        project: importTest.project,
                        location: importTest.location || '',
                        testType: importTest.testType || 'Horizontal',
                        rValues: importTest.rValues,
                        timestamp: new Date().toISOString()
                    };

                    existingTests.push(newTest);
                    importedCount++;
                });

                this.saveTestToStorage(existingTests);
                this.loadProjects();
                
                alert(`Import completed!\nImported: ${importedCount} tests\nSkipped: ${skippedCount} tests (duplicates or invalid)`);
                
            } catch (error) {
                alert(`Import failed: ${error.message}`);
            }
            
            // Clear the file input
            document.getElementById('import-file').value = '';
        };
        
        reader.readAsText(file);
    }

    onProjectFieldChange(projectName) {
        // Update location datalist to show only locations from this project
        this.updateLocationDatalist();
        // Auto-load test when project changes
        this.autoLoadTest();
    }

    onLocationFieldChange() {
        // Auto-load test when location changes
        this.autoLoadTest();
    }

    autoLoadTest() {
        const project = document.getElementById('project').value.trim();
        const location = document.getElementById('test-location').value.trim();
        
        // Only auto-load if both fields have values
        if (!project || !location) {
            return;
        }

        const tests = this.getSavedTests();
        const matchingTests = tests.filter(test => 
            test.project === project && test.location === location
        );

        if (matchingTests.length === 1) {
            // Exact match found - load it automatically
            const testToLoad = matchingTests[0];
            
            // Load test type
            this.currentTestType = testToLoad.testType;
            document.querySelector(`input[value="${testToLoad.testType}"]`).checked = true;
            
            // Clear all inputs first
            this.inputFields.forEach(input => input.value = '');
            
            // Load R-values
            testToLoad.rValues.forEach((value, index) => {
                if (index < this.inputFields.length) {
                    this.inputFields[index].value = value;
                }
            });
            
            // Clear previous results and chart
            document.getElementById('results').textContent = '';
            document.getElementById('chart-container').innerHTML = '';
            
            // Auto-calculate results after loading test data
            setTimeout(() => {
                this.calculate();
            }, 100); // Small delay to ensure all fields are updated
        }
    }

    shareProject() {
        const project = document.getElementById('project').value.trim();
        
        if (!project) {
            alert('Please select a project to share.');
            return;
        }

        const tests = this.getSavedTests();
        const projectTests = tests.filter(test => test.project === project);
        
        if (projectTests.length === 0) {
            alert('No tests found for the selected project.');
            return;
        }

        // Create shareable data
        const shareData = {
            projectName: project,
            shareDate: new Date().toISOString(),
            tests: projectTests.map(test => ({
                location: test.location,
                testType: test.testType,
                rValues: test.rValues,
                timestamp: test.timestamp
            }))
        };

        // Encode the data for URL
        const encodedData = btoa(JSON.stringify(shareData));
        const baseUrl = 'https://magnusfjeldolsen.github.io/proceq_recoil_hammer_postprocessor/';
        const shareUrl = `${baseUrl}?share=${encodedData}`;

        // Copy to clipboard and show dialog
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert(
                `Project "${project}" is ready to share!\n\n` +
                `The shareable URL has been copied to your clipboard.\n\n` +
                `This link contains:\n` +
                `• ${projectTests.length} test location(s)\n` +
                `• All R-values and test orientations\n` +
                `• Original timestamps\n\n` +
                `Anyone with this link can view your project data.`
            );
        }).catch(() => {
            // Fallback for browsers that don't support clipboard API
            prompt(
                `Copy this URL to share the project "${project}":`,
                shareUrl
            );
        });
    }

    shareTest() {
        const project = document.getElementById('project').value.trim();
        const location = document.getElementById('test-location').value.trim();
        
        if (!project) {
            alert('Please enter a project name to share the test.');
            return;
        }
        
        if (!location) {
            alert('Please enter a test location to share the test.');
            return;
        }

        // Get current R-values from input fields
        const rValues = [];
        for (let i = 0; i < this.inputFields.length; i++) {
            const value = this.inputFields[i].value.trim();
            if (value) {
                const num = parseFloat(value);
                if (!isNaN(num)) {
                    rValues.push(num);
                }
            }
        }

        if (rValues.length === 0) {
            alert('Please enter some R-values to share the test.');
            return;
        }

        // Create shareable test data
        const shareData = {
            type: 'test', // Flag to distinguish from project shares
            projectName: project,
            location: location,
            testType: this.currentTestType,
            rValues: rValues,
            shareDate: new Date().toISOString()
        };

        // Encode the data for URL
        const encodedData = btoa(JSON.stringify(shareData));
        const baseUrl = 'https://magnusfjeldolsen.github.io/proceq_recoil_hammer_postprocessor/';
        const shareUrl = `${baseUrl}?share=${encodedData}`;

        // Copy to clipboard and show dialog
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert(
                `Test "${location}" from project "${project}" is ready to share!\n\n` +
                `The shareable URL has been copied to your clipboard.\n\n` +
                `This link contains:\n` +
                `• Project: ${project}\n` +
                `• Location: ${location}\n` +
                `• Test Type: ${this.currentTestType}\n` +
                `• ${rValues.length} R-values\n\n` +
                `Anyone with this link can view this specific test.`
            );
        }).catch(() => {
            // Fallback for browsers that don't support clipboard API
            prompt(
                `Copy this URL to share the test "${location}" from project "${project}":`,
                shareUrl
            );
        });
    }

    checkForSharedProject() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedData = urlParams.get('share');
        
        if (sharedData) {
            try {
                const decodedData = JSON.parse(atob(sharedData));
                
                // Check if it's a single test or project share
                if (decodedData.type === 'test') {
                    this.loadSharedTest(decodedData);
                } else {
                    this.loadSharedProject(decodedData);
                }
            } catch (error) {
                console.error('Invalid shared data:', error);
                alert('The shared link appears to be invalid.');
            }
        }
    }

    loadSharedProject(shareData) {
        if (!shareData.projectName || !shareData.tests) {
            alert('Invalid shared project data.');
            return;
        }

        // Ask user if they want to load the shared project
        const shareDate = new Date(shareData.shareDate).toLocaleDateString();
        const choice = confirm(
            `Load shared project?\n\n` +
            `Project: ${shareData.projectName}\n` +
            `Shared: ${shareDate}\n` +
            `Test locations: ${shareData.tests.length}\n\n` +
            `This will temporarily load the shared project data.\n` +
            `Your existing data will not be affected.`
        );

        if (!choice) return;

        // Load the shared project data (temporarily, not saved to localStorage)
        this.currentSharedProject = shareData;
        
        // Update the project field and populate autocomplete
        document.getElementById('project').value = shareData.projectName;
        
        // Update location datalist with shared project locations
        const locationDatalist = document.getElementById('location-datalist');
        locationDatalist.innerHTML = '';
        
        shareData.tests.forEach(test => {
            const option = document.createElement('option');
            option.value = test.location;
            locationDatalist.appendChild(option);
        });

        // Load the first test automatically if there's only one
        if (shareData.tests.length === 1) {
            this.loadSharedTest(shareData.tests[0]);
        } else {
            alert(`Shared project loaded!\n\nSelect a test location to see the data:\n${shareData.tests.map(t => '• ' + t.location).join('\n')}`);
        }
    }

    loadSharedTest(testData) {
        // Check if this is a single test share or part of a project share
        const projectName = testData.projectName || (this.currentSharedProject && this.currentSharedProject.projectName);
        const location = testData.location;
        
        if (testData.type === 'test') {
            // This is a direct test share, ask user if they want to load it
            const shareDate = new Date(testData.shareDate).toLocaleDateString();
            const choice = confirm(
                `Load shared test?\n\n` +
                `Project: ${projectName}\n` +
                `Location: ${location}\n` +
                `Test Type: ${testData.testType}\n` +
                `R-values: ${testData.rValues.length}\n` +
                `Shared: ${shareDate}\n\n` +
                `This will load the test data into the current form.\n` +
                `Any unsaved changes will be lost.`
            );
            
            if (!choice) {
                return;
            }
        }
        
        // Set project and location
        document.getElementById('project').value = projectName;
        document.getElementById('test-location').value = location;
        
        // Set test type
        this.currentTestType = testData.testType;
        document.querySelector(`input[value="${testData.testType}"]`).checked = true;
        
        // Clear and load R-values
        this.inputFields.forEach(input => input.value = '');
        testData.rValues.forEach((value, index) => {
            if (index < this.inputFields.length) {
                this.inputFields[index].value = value;
            }
        });
        
        // Auto-calculate if we have enough data
        if (testData.rValues.length >= 9) {
            setTimeout(() => {
                this.calculate();
            }, 100);
        }
    }

    // Override autoLoadTest to handle shared projects
    autoLoadTest() {
        const project = document.getElementById('project').value.trim();
        const location = document.getElementById('test-location').value.trim();
        
        // Only auto-load if both fields have values
        if (!project || !location) {
            return;
        }

        // Check if we're working with a shared project
        if (this.currentSharedProject && this.currentSharedProject.projectName === project) {
            const sharedTest = this.currentSharedProject.tests.find(test => test.location === location);
            if (sharedTest) {
                this.loadSharedTest(sharedTest);
                return;
            }
        }

        // Normal auto-load logic for saved tests
        const tests = this.getSavedTests();
        const matchingTests = tests.filter(test => 
            test.project === project && test.location === location
        );

        if (matchingTests.length === 1) {
            // Exact match found - load it automatically
            const testToLoad = matchingTests[0];
            
            // Load test type
            this.currentTestType = testToLoad.testType;
            document.querySelector(`input[value="${testToLoad.testType}"]`).checked = true;
            
            // Clear all inputs first
            this.inputFields.forEach(input => input.value = '');
            
            // Load R-values
            testToLoad.rValues.forEach((value, index) => {
                if (index < this.inputFields.length) {
                    this.inputFields[index].value = value;
                }
            });
            
            // Clear previous results and chart
            document.getElementById('results').textContent = '';
            document.getElementById('chart-container').innerHTML = '';
            
            // Auto-calculate results after loading test data
            setTimeout(() => {
                this.calculate();
            }, 100); // Small delay to ensure all fields are updated
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RecoilHammerApp();
});