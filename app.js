/**
 * THE PLATINUM HORIZON (Concept 2 Background) & TEAM BIO LOGIC
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Loader
    const loaderLine = document.getElementById('loader-line');
    const loader = document.getElementById('loader');
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        loaderLine.style.width = Math.min(progress, 100) + '%';
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                loader.style.opacity = '0';
                document.body.classList.remove('loading-state');
                setTimeout(() => loader.style.display = 'none', 1000);
            }, 600);
        }
    }, 120);

    // 2. HEADER SCROLL EFFECT
    const header = document.querySelector('.site-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 3. Three.js Background
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x999fa1, 0.0025); // Platinum Fog

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('hero-canvas'), 
        alpha: true, 
        antialias: true 
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const geometry = new THREE.PlaneGeometry(100, 100, 64, 64);
    
    const material = new THREE.MeshPhongMaterial({ 
        color: 0x16283d, // Correct Brand Navy
        specular: 0x111111, 
        shininess: 30, 
        side: THREE.DoubleSide,
        flatShading: true 
    });

    const surface = new THREE.Mesh(geometry, material);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = -10; 
    scene.add(surface);

    // INCREASED LIGHTING INTENSITY
    const ambient = new THREE.AmbientLight(0xffffff, 0.9); 
    scene.add(ambient);

    const mainLight = new THREE.PointLight(0xffffff, 0.8, 50); 
    mainLight.position.set(0, 20, 0);
    scene.add(mainLight);

    camera.position.set(0, 10, 20);
    camera.lookAt(0, 0, 0);

    const animate = (time) => {
        time *= 0.0003;
        const pos = geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const z = Math.sin(x * 0.1 + time) * 2 + Math.cos(y * 0.1 + time) * 2;
            pos.setZ(i, z);
        }
        pos.needsUpdate = true;
        camera.position.x = Math.sin(time * 0.5) * 5;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
});

// 4. TEAM DATA & MODAL LOGIC (UNCHANGED)
// ... (Keep the rest of the file exactly as it was) ...
const teamData = {
    "robert": {
        name: "Robert T. Taylor",
        role: "JD, CPA, CVA",
        img: "rt-Gray.png",
        bio: `<p>Rob is the President of TM Advisors, a regional wealth management firm specializing in tax, financial advisory, and alternative investments. With nearly two decades of experience as a CPA, attorney, and investment advisor, Rob brings a unique combination of expertise to lead TM Advisors in delivering exceptional financial solutions for clients.</p>
              <p>As a Certified Valuation Analyst (CVA) and Certified in Financial Forensics (CFF), Rob’s skill set enables him to address complex financial challenges with precision. His leadership has established TM Advisors as a trusted partner for individuals and businesses seeking innovative and strategic approaches to wealth management.</p>
              <p>Rob earned his Juris Doctor degree from Michigan State University College of Law and holds a Bachelor of Arts in Accounting and Economics from Alma College, where he also excelled as an All-Conference basketball player. These experiences shaped his commitment to teamwork, strategic thinking, and results-oriented leadership.</p>
              <p>In addition to his role at TM Advisors, Rob is a partner at Taylor & Morgan CPAs, where he leads the firm’s M&A group. He is also the Managing Partner of Taylor Capital, a real estate investment fund headquartered in Charlotte, NC. These roles further reflect his dedication to delivering comprehensive financial solutions and driving successful outcomes for clients and investors.</p>`
    },
    "brett-long": {
        name: "Brett Long",
        role: "CFP, CRPC",
        img: "Brett-Long-gray.png",
        bio: `<p>Brett Long serves as the Chief Operating Officer for TM Advisors where he is responsible for overseeing key business functions, streamlining operations, and nurturing client relationships to ensure exceptional service and strategic financial planning. In addition to this role, Brett also holds the position of Chief Operating Officer at Taylor Capital.</p>
              <p>Brett holds several designations, including Certified Financial Planner (CFP) and Chartered Retirement Planning Counselor (CRPC). These qualifications underscore his commitment to providing clients with well-rounded financial advice. Brett’s areas of specialization encompass investment analysis, financial modeling, tax planning, financing, and retirement planning, reflecting his ability to address a broad spectrum of financial challenges with precision and insight.</p>
              <p>Brett graduated from Michigan State University in 2015 with a Bachelor of Arts in Finance. Driven by a deep passion for finance and a desire to make a meaningful impact on others’ financial well-being, Brett embarked on a career in wealth management. Before joining TM Advisors, Brett accumulated nearly seven years of experience as an investment advisor at a prominent regional financial institution. During this time, he developed a robust skill set in managing a diverse portfolio of clients, each with unique financial needs and varying levels of complexity. His hands-on experience has equipped him with a comprehensive understanding of the intricacies involved in effective wealth management & corporate real estate solutions.</p>
              <p>In addition to his professional endeavors, Brett is known for his dedication to continuous learning and staying abreast of industry developments, which ensures he delivers the most current and effective strategies to his clients. His combination of technical expertise, strategic vision, and client-centered approach makes him a valuable asset to TM Advisors, Taylor Capital, and the clients he serves.</p>`
    },
    "bryan-long": {
        name: "Bryan Long",
        role: "CFP",
        img: "Bryan-Long-gray.png",
        bio: `<p>Bryan Long, CFP serves as Chief Development Officer of TM Advisors. In this role, he leads the firm’s strategic growth and development efforts, leveraging his deep expertise in financial planning, investment management, and client relations. Bryan’s comprehensive understanding of wealth management and capital markets enables him to drive initiatives that align with the firm’s long-term vision.</p>
              <p>In 2020, Bryan earned the Certified Financial Planner™ (CFP®) designation, reflecting his dedication to providing clients with the highest level of financial expertise and ethical standards. His specialization in private markets—including private equity, private credit, and private real estate—has significantly enhanced the firm’s investment offerings. Bryan excels at identifying and capitalizing on opportunities in these asset classes, consistently delivering value to investors.</p>
              <p>With a strong commitment to helping clients achieve their financial goals, Bryan combines forward-thinking leadership with a dedication to excellence. His contributions have reinforced the firm’s reputation for delivering innovative strategies and exceptional client service.</p>`
    },
    "andrew": {
        name: "Andrew Morgan",
        role: "CPA",
        img: "Andrew-Morgan-gray.png",
        bio: `<p>Andrew Morgan, CPA, serves as the Chief Investment Officer of TM Advisors. In this role, Andrew is responsible for developing and communicating the firm’s investment strategy, conducting in-depth investment analysis, managing portfolio risk, and overseeing capital allocation decisions. He also leads the evaluation of new investment opportunities, ensuring the firm achieves strategic and financial objectives for clients.</p>
              <p>Andrew also specializes in Merger & Acquisition advisory, guiding clients through transactions to drive strategic growth and maximize shareholder value. His expertise spans financial analysis, valuation, deal structuring, and negotiation, ensuring clients achieve optimal outcomes in complex transactions.</p>
              <p>Andrew joined TM Advisors in 2020, bringing with him five years of experience at a large regional investment firm in the Midwest, where he specialized in mergers, acquisitions, and private investment analysis. He was educated at Michigan State University and the London School of Economics and became a Certified Public Accountant in 2017.</p>
              <p>In addition to his work at TM Advisors, Andrew also serves as the Chief Investment Officer for Taylor Capital, LLC, where he applies his expertise in shaping investment strategies and overseeing investment analysis of both stabilized and development opportunities.</p>`
    },
    "tracey": {
        name: "Tracey Pannell",
        role: "Director of Compliance",
        img: "Tracey-Pannell-gray.png",
        bio: `<p>Tracey Pannell serves as the Director of Compliance and Client Services at TM Advisors, LLC, a leading investment firm that offers personalized wealth management services. Her expertise in operational compliance and dedication to client satisfaction have played a vital role in enhancing customer retention and fostering long-term client relationships.</p>
              <p>Additionally, she holds the position of Compliance and Investor Relations Director at Taylor Capital, LLC, a private investment fund renowned for its commitment to integrity and transparency. In this role, Tracey oversees compliance and risk management while cultivating strong relationships with the firm’s investors.</p>
              <p>Before these roles, Tracey spent eight years working for Taylor & Morgan CPAs, gaining valuable experience in the areas of accounting, tax, and finance. This strong foundation, combined with her leadership in compliance, ensures that both firms maintain the highest standards of operational excellence and client care.</p>`
    },
    "tom": {
        name: "Tom Taylor",
        role: "CPA",
        img: "tom-t-Gray.png",
        bio: `<p>With over 40 years of experience in financial services and accounting, Tom Taylor is a trusted advisor to high-net-worth individuals and family offices. He specializes in crafting personalized strategies that maximize wealth preservation and growth, helping clients navigate complex financial and tax landscapes with confidence.</p>
              <p>Tom also serves as the Chief Tax Officer at Taylor Capital, LLC, where he develops sophisticated tax strategies for the firm’s real estate investment fund, Dormie Equity Partners, LP. His expertise in structuring real estate transactions for tax efficiency—including cost segregation, 1031 exchanges, and opportunity zone investments—has consistently enhanced after-tax returns for investors.</p>
              <p>Before joining TM Advisors, Tom was the founder and Managing Partner of Taylor & Morgan CPAs, where he spent decades growing the firm into a regional powerhouse. Under his leadership, the firm expanded from a single office into a multi-state operation, advising clients across the U.S. Prior to that, he honed his expertise at Ernst & Young (formerly Ernst & Ernst).</p>
              <p>Tom is an active member of the American Institute of CPAs (AICPA) and the Michigan Association of CPAs (MACPA). As a graduate of the University of Michigan – Flint, he was honored as “Alumnus of the Year” and has served on the university’s Citizens Advisory Committee, as well as the Board of Directors for several privately held corporations.</p>`
    },
    "brett-quayle": {
        name: "Brett Quayle",
        role: "CFP, CRPC",
        img: "Brett-gray.png",
        bio: `<p>Brett Quayle is the youngest son of Robert Quayle, the founder of Quayle Financial Group. Over the past 10 years, Brett, a CERTIFIED FINANCIAL PLANNER™, has worked with his father, Robert, to continue to establish a familial feel at Quayle Financial.</p>
              <p>Brett, a 2003 Albion College graduate, was a part of the Carl A. Gerstacker Program while at Albion, and graduated with a degree in Economics and Management. Brett is married to his lovely wife Amy and has three sons, Christopher, Bennett, and Kyler. Beyond his certification as a CFP®, Brett has also earned his CRPC® designation.</p>`
    },
    "robert-quayle": {
        name: "Robert Quayle",
        role: "Founder, Quayle Financial",
        img: "bob-q-gray.png",
        bio: `<p>Robert Quayle has been in the insurance finance business for over 40 years. Working side by side with his son Brett, they have recently merged their company to form Taylor & Morgan, Quayle Financial.</p>
              <p>Robert graduated from Bowling Green State University, and majored in finance and marketing. He also played on Bowling Green’s basketball team. Robert has been happily married to his wife Kathy for 30 years, and has 3 children, and 7 grandchildren. In his spare time, you can find Robert spending time with his family, or enjoying a round of golf with his friends and colleagues.</p>`
    },
    "brandon": {
        name: "Brandon Taylor",
        role: "CPA",
        img: "bt_gray.jpg",
        bio: `<p>Brandon Taylor, CPA, is Tax & Finance Manager at TM Advisors, where he provides tax strategy and financial insight to the firm’s clients and internal teams. He supports complex tax planning, M&A-related analysis, due diligence, and tax compliance for individuals, partnerships, and investment entities.</p>
              <p>Brandon collaborates closely with TM Advisors’ senior leadership to ensure that clients receive clear, timely, and thoughtful tax guidance tailored to their evolving financial goals. His role bridges day-to-day financial execution with strategic insight, supporting both planning and operational needs.</p>
              <p>Before joining TM Advisors, Brandon worked as a Senior Associate at PwC, advising private companies on the tax implications of corporate transactions, ownership changes, and regulatory filings. He was also part of PwC’s national AI Champion program. Brandon is a licensed CPA in North Carolina and holds undergraduate and graduate degrees from UNC-Chapel Hill’s Kenan-Flagler Business School.</p>`
    }
};

// --- NAVIGATION LOGIC ---
const memberKeys = Object.keys(teamData); 
let currentMemberIndex = 0;

window.openBio = function(id) {
    const index = memberKeys.indexOf(id);
    if (index === -1) return;
    
    currentMemberIndex = index;
    updateModalContent(id);
    updateNavButtons();

    document.getElementById('bio-modal').classList.add('active');
    document.body.style.overflow = 'hidden'; 
};

window.changeBio = function(direction) {
    const newIndex = currentMemberIndex + direction;
    if (newIndex >= 0 && newIndex < memberKeys.length) {
        currentMemberIndex = newIndex;
        const newId = memberKeys[newIndex];
        updateModalContent(newId);
        updateNavButtons();
    }
};

function updateModalContent(id) {
    const data = teamData[id];
    document.getElementById('modal-name').textContent = data.name;
    document.getElementById('modal-role').textContent = data.role;
    document.getElementById('modal-bio-text').innerHTML = data.bio;
    
    const imgEl = document.getElementById('modal-img');
    const placeholderEl = document.getElementById('modal-placeholder');
    
    if (data.img && !data.img.includes('path/to/')) {
        imgEl.src = data.img;
        imgEl.style.display = 'block';
        if(placeholderEl) placeholderEl.style.display = 'none';
    } else {
        imgEl.style.display = 'none';
        if(placeholderEl) placeholderEl.style.display = 'block';
    }
}

function updateNavButtons() {
    const prevBtn = document.querySelector('.modal-nav.prev');
    const nextBtn = document.querySelector('.modal-nav.next');
    
    if (currentMemberIndex === 0) {
        prevBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'flex';
    }

    if (currentMemberIndex === memberKeys.length - 1) {
        nextBtn.style.display = 'none';
    } else {
        nextBtn.style.display = 'flex';
    }
}

window.closeBio = function(e) {
    if (e.target.id === 'bio-modal' || e.target.classList.contains('modal-close')) {
        document.getElementById('bio-modal').classList.remove('active');
        document.body.style.overflow = 'visible'; 
    }
};