"use client";

import React, { useEffect, useRef } from 'react';
import RoleSwitcher from './RoleSwitcher';
import "../styles/components/topbar.css";

const Topbar = () => {
	const underlineRef = useRef<HTMLDivElement>(null);

	const updateUnderline = (el: HTMLElement) => {
		if (underlineRef.current) {
			underlineRef.current.style.left = `${el.offsetLeft}px`;
			underlineRef.current.style.width = `${el.offsetWidth}px`;
		}
	};

	useEffect(() => {
		const topLinks = document.querySelectorAll('.top-link');

		const handleClick = (e: Event) => {
			e.preventDefault();
			const target = e.currentTarget as HTMLElement;
			topLinks.forEach((l) => l.classList.remove('active'));
			target.classList.add('active');
			updateUnderline(target);
		};

		topLinks.forEach((link) => {
			link.addEventListener('click', handleClick);
		});

		const handleResize = () => {
			const activeLink = document.querySelector('.top-link.active') as HTMLElement;
			if (activeLink) {
				requestAnimationFrame(() => updateUnderline(activeLink));
			}
		};

		// Watch sidebar class changes (e.g., collapse/expand)
		const sidebar = document.querySelector('.sidebar');
		const mutationObserver = new MutationObserver(() => handleResize());
		if (sidebar) {
			mutationObserver.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
		}

		// Watch top-links resizing (container changes)
		const topLinksContainer = document.querySelector('.top-links');
		const resizeObserver = new ResizeObserver(() => handleResize());
		if (topLinksContainer) {
			resizeObserver.observe(topLinksContainer);
		}

		// Initial positioning
		handleResize();
		window.addEventListener('resize', handleResize);

		return () => {
			topLinks.forEach((link) => {
				link.removeEventListener('click', handleClick);
			});
			window.removeEventListener('resize', handleResize);
			mutationObserver.disconnect();
			if (topLinksContainer) resizeObserver.unobserve(topLinksContainer);
		};
	}, []);

	return (
		<div className="top-bar">
			<div className="top-links">
				<a href="#" className="top-link">Dashboard</a>
				<a href="#" className="top-link active">Finance</a>
				<a href="#" className="top-link">Human Resource</a>
				<a href="#" className="top-link">Inventory</a>
				<a href="#" className="top-link">Operational</a>
				<div className="link-underline" ref={underlineRef}></div>
			</div>
			<div className="top-bar-right">
				<RoleSwitcher />
			</div>
		</div>
	);
};

export default Topbar;
