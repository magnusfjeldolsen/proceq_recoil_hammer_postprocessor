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
        this.init();
    }

    init() {
        this.createUI();
        this.setupEventListeners();
    }

    createUI() {
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="controls-panel">
                <h1>Proceq Recoil Hammer Test Processor</h1>
                
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

                <div class="results-section">
                    <h2>Results</h2>
                    <div class="results-display" id="results"></div>
                </div>
            </div>

            <div class="chart-panel">
                <h2 class="chart-title">Reference Curve and Test Points</h2>
                <div id="chart-container"></div>
            </div>
        `;

        this.inputFields = document.querySelectorAll('.input-field');
    }

    setupEventListeners() {
        // Test type selection
        document.querySelectorAll('input[name="testType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentTestType = e.target.value;
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
        let results = `${'R'.padStart(8)} ${'fck_cube150'.padStart(12)} ${'fck_cylinder'.padStart(14)}\n`;
        
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

        // Scales
        const allR = [...refR, ...testR];
        const allFck = [...refFck, ...testFck];
        
        const xScale = d3.scaleLinear()
            .domain(d3.extent(allR))
            .range([0, width])
            .nice();

        const yScale = d3.scaleLinear()
            .domain(d3.extent(allFck))
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

        // Reference curve line
        const line = d3.line()
            .x(d => xScale(d.r))
            .y(d => yScale(d.fck));

        const refData = refR.map((r, i) => ({ r, fck: refFck[i] }));
        
        g.append('path')
            .datum(refData)
            .attr('class', 'reference-line')
            .attr('d', line);

        // Reference points
        g.selectAll('.reference-points')
            .data(refData)
            .enter().append('circle')
            .attr('class', 'reference-points')
            .attr('cx', d => xScale(d.r))
            .attr('cy', d => yScale(d.fck))
            .attr('r', 4);

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

    clearInputs() {
        this.inputFields.forEach(input => {
            input.value = '';
        });
        document.getElementById('results').textContent = '';
        document.getElementById('chart-container').innerHTML = '';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RecoilHammerApp();
});