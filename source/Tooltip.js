import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import ReactDOM from 'react-dom'
import classNames from 'classnames'

// https://github.com/Dogfalo/materialize/blob/master/js/tooltip.js
export default class Tooltip extends PureComponent
{
	static propTypes =
	{
		// Tooltip text
		text : PropTypes.string,

		// Whether this element should be displayed as `inline-block`.
		// (is `true` by default)
		inline : PropTypes.bool.isRequired,

		// The delay before the tooltip is shown (in milliseconds)
		delay : PropTypes.number.isRequired,

		// The duration of the tooltip hiding animation.
		// The DOM element will retain `display: block` for this time period.
		// When changing this timeout also change `transition` time for
		// `.tooltip--after-show` and `.tooltip--before-hide` CSS classes.
		// Is `120` by default.
		hidingAnimationDuration : PropTypes.number.isRequired,

		// `container: () => DOMElement` property is optional
		// and is gonna be the parent DOM Element for the tooltip itself
		// (`document.body` by default).
		// (in which case make sure that `document.body` has no `margin`
		//  otherwise tooltip `left` and `top` positions will be slightly off).
		container : PropTypes.func,

		// CSS style object
		style : PropTypes.object,

		// CSS class name
		className : PropTypes.string,

		// Tooltip CSS class name
		tooltipClassName : PropTypes.string
	}

	static defaultProps =
	{
		inline : true,
		delay : 200, // in milliseconds
		hidingAnimationDuration : 120, // in milliseconds
		container : () => document.body
	}

	componentWillReceiveProps({ text })
	{
		// Update tooltip text
		if (this.tooltip && text !== this.props.text)
		{
			this.tooltip.textContent = text
		}
	}

	componentWillUnmount()
	{
		clearTimeout(this.show_timeout)
		clearTimeout(this.hide_timeout)

		this.show_timeout = undefined
		this.hide_timeout = undefined

		this.destroy_tooltip()
	}

	create_tooltip()
	{
		const { text, tooltipClassName } = this.props

		this.tooltip = document.createElement('div')

		// this.tooltip.style.display  = 'none'
		this.tooltip.style.position = 'absolute'
		this.tooltip.style.left = 0
		this.tooltip.style.top  = 0

		this.tooltip.classList.add('rrui__tooltip')

		if (tooltipClassName)
		{
			this.tooltip.classList.add(tooltipClassName)
		}

		this.tooltip.textContent = text

		this.container().appendChild(this.tooltip)
	}

	destroy_tooltip()
	{
		if (this.tooltip)
		{
			// Won't throw an exception
			this.tooltip.parentNode.removeChild(this.tooltip)
			this.tooltip = undefined
		}
	}

	container()
	{
		const { container } = this.props
		return container()
	}

	calculate_coordinates()
	{
		const width  = this.tooltip.offsetWidth
		const height = this.tooltip.offsetHeight

		const origin = ReactDOM.findDOMNode(this.origin)

		const origin_width  = origin.offsetWidth
		// const origin_height = origin.offsetHeight

		const _offset = offset(origin)

		const top  = _offset.top - height - offset(this.container()).top
		const left = _offset.left + origin_width / 2 - width / 2

		return reposition_within_screen(left, top, width, height)
	}

	show = () =>
	{
		// Play tooltip showing animation
		let animate = false

		// If hiding animation is being played,
		// then cancel it, and cancel setting
		// `display` to `none` after it finishes playing.
		if (this.hide_timeout)
		{
			clearTimeout(this.hide_timeout)
			this.hide_timeout = undefined

			// Abort tooltip hiding animation.
			// It will automatically return to the "showing" state.
			this.tooltip.classList.remove('rrui__tooltip--before-hide')
		}
		// Otherwise, the tooltip is hidden (or never been shown)
		else
		{
			if (!this.tooltip)
			{
				this.create_tooltip()
			}

			// this.tooltip.style.display = 'block'

			// Play tooltip showing animation
			animate = true
		}

		const { x, y } = this.calculate_coordinates()

		this.tooltip.style.left = `${x}px`
		this.tooltip.style.top  = `${y}px`

		// Play tooltip showing animation
		// (doing it after setting position because
		//  setting position applies `display: block`)
		if (animate)
		{
			this.tooltip.classList.add('rrui__tooltip--after-show')
		}
	}

	hide = () =>
	{
		const { hidingAnimationDuration } = this.props

		// If already hiding, or if already hidden, then do nothing.
		// if (this.hide_timeout || this.tooltip.style.display === 'none')
		if (this.hide_timeout || !this.tooltip)
		{
			return
		}

		// Play tooltip hiding animation
		this.tooltip.classList.add('rrui__tooltip--before-hide')

		// Set the tooltip to `display: none`
		// after its hiding animation finishes.
		this.hide_timeout = setTimeout(() =>
		{
			this.hide_timeout = undefined
			this.destroy_tooltip()
			// this.tooltip.style.display = 'none'
			// this.tooltip.classList.remove('rrui__tooltip--before-hide')
			// this.tooltip.classList.remove('rrui__tooltip--after-show')
		},
		hidingAnimationDuration)
	}

	on_mouse_enter = () =>
	{
		const { text } = this.props

		// mouse enter and mouse leave events
		// are triggered on mobile devices too
		if (this.mobile)
		{
			return
		}

		// If the tooltip has no text then don't show it.
		if (!text)
		{
			return
		}

		// Shouldn't happen, because
		// `mouse leave` event clears this timeout.
		if (this.show_timeout)
		{
			return
		}

		const { delay } = this.props

		// Don't show the tooltip immediately
		// but rather wait for the user to
		// "mouse over" it for a short time interval.
		// (prevents false positives)
		this.show_timeout = setTimeout(() =>
		{
			this.show_timeout = undefined
			this.show()
		},
		delay)
	}

	on_mouse_leave = () =>
	{
		// mouse enter and mouse leave events
		// are triggered on mobile devices too
		if (this.mobile)
		{
			return
		}

		// If tooltip hasn't been shown yet,
		// then cancel showing it.
		if (this.show_timeout)
		{
			clearTimeout(this.show_timeout)
			this.show_timeout = undefined
			return
		}

		// Otherwise, the tooltip is shown, so hide it.
		this.hide()
	}

	on_touch_start = () =>
	{
		const { text } = this.props

		// mouse enter events won't be processed from now on
		this.mobile = true

		// If the tooltip has no text then don't show it.
		if (!text)
		{
			return
		}

		this.show()
	}

	render()
	{
		// Shows tooltip on mouse over when on desktop.
		// Shows tooltip on touch when on mobile.

		const
		{
			inline,
			style,
			className,
			children,

			// These properties are here just for `...rest`
			text,
			delay,
			hidingAnimationDuration,
			container,
			tooltipClassName,

			// Pass through all other properties
			...rest
		}
		= this.props

		return (
			<div
				{...rest}
				ref={ ref => this.origin = ref }
				onMouseEnter={ this.on_mouse_enter }
				onMouseLeave={ this.on_mouse_leave }
				onTouchStart={ this.on_touch_start }
				onTouchMove={ this.hide }
				onTouchEnd={ this.hide }
				onTouchCancel={ this.hide }
				style={ inline ? (style ? { ...inline_style, ...style } : inline_style) : style }
				className={ classNames('rrui__tooltip__target', className) }>
				{ children }
			</div>
		)
	}
}

function reposition_within_screen(x, y, width, height)
{
	const minimal_margin = 4 // in pixels

	if (x < minimal_margin)
	{
		x = minimal_margin
	}
	else if (x + width + minimal_margin > window.innerWidth)
	{
		x -= (x + width + minimal_margin) - window.innerWidth
	}

	if (y < window.pageYOffset + minimal_margin)
	{
		y = window.pageYOffset + minimal_margin
	}
	else if (y + height + minimal_margin > window.pageYOffset + window.innerHeight)
	{
		y -= (y + height + minimal_margin) - (window.pageYOffset + window.innerHeight)
	}

	return { x, y }
}

// http://stackoverflow.com/questions/5598743/finding-elements-position-relative-to-the-document
function offset(element)
{
	const rect = element.getBoundingClientRect()

	const client_left = document.clientLeft || document.body.clientLeft || 0
	const client_top  = document.clientTop || document.body.clientTop || 0

	const top  = rect.top + window.pageYOffset - client_top
	const left = rect.left + window.pageXOffset - client_left

	return { top, left }
}

const inline_style =
{
	display : 'inline-block'
}