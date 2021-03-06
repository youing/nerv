// tslint:disable-next-line:max-line-length
import {
  isVNode,
  isVText,
  isStateless,
  isNullOrUndef,
  isInvalid,
  isComposite,
  isBoolean
} from './is'
import { isString, isNumber, isFunction, isArray } from 'nerv-utils'
import {
  encodeEntities,
  isVoidElements,
  getCssPropertyName,
  isUnitlessNumber,
  extend
} from './utils'

const skipAttributes = {
  ref: true,
  key: true,
  children: true,
  owner: true
}

function hashToClassName (obj) {
  const arr: string[] = []
  for (const i in obj) {
    if (obj[i]) {
      arr.push(i)
    }
  }
  return arr.join(' ')
}

function renderStylesToString (styles: string | object): string {
  if (isString(styles)) {
    return styles
  } else {
    let renderedString = ''
    for (const styleName in styles) {
      const value = styles[styleName]

      if (isString(value)) {
        renderedString += `${getCssPropertyName(styleName)}${value};`
      } else if (isNumber(value)) {
        renderedString += `${getCssPropertyName(
          styleName
        )}${value}${isUnitlessNumber[styleName] ? '' : 'px'};`
      }
    }
    return renderedString
  }
}

function renderVNodeToString (vnode, parent, context, isSvg?: boolean) {
  if (isNullOrUndef(vnode) || isBoolean(vnode)) {
    return ''
  }
  const { type, props, children } = vnode
  if (isVText(vnode)) {
    return encodeEntities(vnode.text)
  } else if (isVNode(vnode)) {
    let renderedString = `<${type}`
    let html
    if (!isNullOrUndef(props)) {
      for (let prop in props) {
        const value = props[prop]
        if (skipAttributes[prop]) {
          continue
        }
        if (prop === 'dangerouslySetInnerHTML') {
          html = value.__html
        } else if (prop === 'style') {
          const styleStr = renderStylesToString(value)
          renderedString += styleStr ? ` style="${renderStylesToString(value)}"` : ''
        } else if (prop === 'class' || prop === 'className') {
          renderedString += ` class="${isString(value)
            ? value
            : hashToClassName(value)}"`
        } else if (prop === 'defaultValue') {
          if (!props.value) {
            renderedString += ` value="${encodeEntities(value)}"`
          }
        } else if (prop === 'defaultChecked') {
          if (!props.checked) {
            renderedString += ` checked="${value}"`
          }
        } else if (isSvg && prop.match(/^xlink\:?(.+)/)) {
          prop = prop.toLowerCase().replace(/^xlink\:?(.+)/, 'xlink:$1')
          renderedString += ` ${prop}="${encodeEntities(value)}"`
        } else {
          if (isString(value)) {
            renderedString += ` ${prop}="${encodeEntities(value)}"`
          } else if (isNumber(value)) {
            renderedString += ` ${prop}="${value}"`
          } else if (value === true) {
            renderedString += ` ${prop}`
          }
        }
      }
    }
    if (isVoidElements[type]) {
      renderedString += `/>`
    } else {
      renderedString += `>`
      if (html) {
        renderedString += html
      } else if (!isInvalid(children)) {
        if (isString(children)) {
          renderedString += children === '' ? ' ' : encodeEntities(children)
        } else if (isNumber(children)) {
          renderedString += children + ''
        } else if (isArray(children)) {
          for (let i = 0, len = children.length; i < len; i++) {
            const child = children[i]
            if (isString(child)) {
              renderedString += child === '' ? ' ' : encodeEntities(child)
            } else if (isNumber(child)) {
              renderedString += child
            } else if (!isInvalid(child)) {
              isSvg = type === 'svg' ? true : type === 'foreignObject' ? false : isSvg
              renderedString += renderVNodeToString(
                child,
                vnode,
                context,
                isSvg
              )
            }
          }
        } else {
          isSvg = type === 'svg' ? true : type === 'foreignObject' ? false : isSvg
          renderedString += renderVNodeToString(children, vnode, context, isSvg)
        }
      }
      if (!isVoidElements[type]) {
        renderedString += `</${type}>`
      }
    }
    return renderedString
  } else if (isComposite(vnode)) {
    const instance = new type(props, context)
    instance._disable = true
    instance.props = props
    instance.context = context
    if (isFunction(instance.componentWillMount)) {
      instance.componentWillMount()
    }
    const rendered = instance.render()
    if (isFunction(instance.getChildContext)) {
      context = extend(extend({}, context), instance.getChildContext())
    }
    return renderVNodeToString(rendered, vnode, context, isSvg)
  } else if (isStateless(vnode)) {
    const rendered = type(props, context)
    return renderVNodeToString(rendered, vnode, context, isSvg)
  }
}

export function renderToString (input: any): string {
  return renderVNodeToString(input, {}, {}) as string
}

export function renderToStaticMarkup (input: any): string {
  return renderVNodeToString(input, {}, {}) as string
}
