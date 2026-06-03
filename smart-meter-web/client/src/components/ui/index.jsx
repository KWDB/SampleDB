import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Button as BaseButton } from '@base-ui/react/button'
import { Dialog } from '@base-ui/react/dialog'
import { Select as BaseSelect } from '@base-ui/react/select'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import { NumberField } from '@base-ui/react/number-field'
import { Check, ChevronDown, ChevronsUpDown, Minus, Plus, X } from 'lucide-react'
import './ui.css'

const cx = (...classes) => classes.filter(Boolean).join(' ')

export const Button = React.forwardRef(({
  children,
  className,
  type = 'default',
  variant,
  size = 'middle',
  icon,
  loading = false,
  disabled = false,
  block = false,
  htmlType = 'button',
  ...props
}, ref) => {
  const intent = variant || type

  return (
    <BaseButton
      ref={ref}
      type={htmlType}
      disabled={disabled || loading}
      className={cx(
        'ui-button',
        `ui-button-${intent}`,
        `ui-button-${size}`,
        block && 'ui-button-block',
        !children && icon && 'ui-button-icon-only',
        className
      )}
      {...props}
    >
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : icon ? <span className="ui-button-icon">{icon}</span> : null}
      {children && <span>{children}</span>}
    </BaseButton>
  )
})

Button.displayName = 'Button'

export const Card = ({ children, className, loading = false, title, extra, bordered: _bordered, variant: _variant, size: _size, ...props }) => (
  <section className={cx('ui-card', className)} aria-busy={loading || undefined} {...props}>
    {(title || extra) && (
      <div className="ui-card-header">
        {title && <h2 className="ui-card-title">{title}</h2>}
        {extra && <div className="ui-card-extra">{extra}</div>}
      </div>
    )}
    <div className="ui-card-body">
      {loading ? <SkeletonBlock rows={4} /> : children}
    </div>
  </section>
)

export const Text = ({ children, className, type, strong = false, code = false, as: Component = 'span', ...props }) => {
  if (code) {
    return <code className={cx('ui-code', className)} {...props}>{children}</code>
  }

  return (
    <Component
      className={cx(
        'ui-text',
        type === 'secondary' && 'ui-text-secondary',
        strong && 'ui-text-strong',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}

export const Paragraph = ({ children, className, ...props }) => (
  <p className={cx('ui-paragraph', className)} {...props}>{children}</p>
)

export const Title = ({ children, level = 2, className, ...props }) => {
  const Heading = `h${level}`
  return <Heading className={cx('ui-title', `ui-title-${level}`, className)} {...props}>{children}</Heading>
}

export const Tag = ({ children, className, ...props }) => (
  <span className={cx('ui-tag', className)} {...props}>{children}</span>
)

export const Space = ({ children, className, size = 'middle', direction = 'horizontal', wrap = false, split, align, style, ...props }) => {
  const items = React.Children.toArray(children).filter(Boolean)
  const gap = typeof size === 'number' ? `${size}px` : undefined

  return (
    <div
      className={cx(
        'ui-space',
        `ui-space-${size}`,
        direction === 'vertical' && 'ui-space-vertical',
        wrap && 'ui-space-wrap',
        className
      )}
      style={{
        gap,
        alignItems: align,
        ...style
      }}
      {...props}
    >
      {split
        ? items.map((child, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="ui-space-split">{split}</span>}
              {child}
            </React.Fragment>
          ))
        : items}
    </div>
  )
}

export const Divider = ({ type = 'horizontal', className }) => (
  <span className={cx('ui-divider', type === 'vertical' && 'ui-divider-vertical', className)} aria-hidden="true" />
)

export const Alert = ({ message, description, type = 'info', icon, showIcon = true, action, className, style }) => (
  <div className={cx('ui-alert', `ui-alert-${type}`, className)} style={style} role={type === 'error' ? 'alert' : 'status'}>
    {showIcon && <span className="ui-alert-icon" aria-hidden="true">{icon || null}</span>}
    <div className="ui-alert-content">
      {message && <div className="ui-alert-message">{message}</div>}
      {description && <div className="ui-alert-description">{description}</div>}
    </div>
    {action && <div className="ui-alert-action">{action}</div>}
  </div>
)

export const DialogModal = ({
  open,
  onOpenChange,
  title,
  children,
  footer,
  width = 560,
  className,
  bodyClassName,
  description,
  forceRender: _forceRender,
  style,
  ...props
}) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Backdrop className="ui-dialog-backdrop" />
      <Dialog.Popup
        className={cx('ui-dialog-popup', className)}
        style={{ '--dialog-width': typeof width === 'number' ? `${width}px` : width, ...style }}
        {...props}
      >
        <div className="ui-dialog-header">
          <div>
            <Dialog.Title className="ui-dialog-title">{title}</Dialog.Title>
            {description && <Dialog.Description className="ui-dialog-description">{description}</Dialog.Description>}
          </div>
          <Dialog.Close className="ui-dialog-close" aria-label="关闭弹窗">
            <X size={16} aria-hidden="true" />
          </Dialog.Close>
        </div>
        <div className={cx('ui-dialog-body', bodyClassName)}>{children}</div>
        {footer && <div className="ui-dialog-footer">{footer}</div>}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
)

export const Select = ({
  options = [],
  value,
  defaultValue,
  onChange,
  placeholder = '请选择',
  className,
  size = 'middle',
  disabled = false,
  allowClear: _allowClear,
  showSearch: _showSearch,
  filterOption: _filterOption,
  style,
  children,
  ...props
}) => {
  const normalizedOptions = useMemo(() => {
    if (options.length > 0) return options
    return React.Children.toArray(children)
      .filter(child => React.isValidElement(child))
      .map(child => ({
        value: child.props.value,
        label: child.props.children
      }))
  }, [children, options])

  return (
    <BaseSelect.Root
      items={normalizedOptions}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(nextValue) => onChange?.(nextValue)}
      disabled={disabled}
      {...props}
    >
      <BaseSelect.Trigger className={cx('ui-select-trigger', `ui-select-${size}`, className)} style={style}>
        <BaseSelect.Value className="ui-select-value" placeholder={placeholder} />
        <BaseSelect.Icon className="ui-select-icon">
          <ChevronsUpDown size={15} aria-hidden="true" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          className="ui-select-positioner"
          align="start"
          alignItemWithTrigger={false}
          collisionPadding={12}
          positionMethod="fixed"
          sideOffset={6}
        >
          <BaseSelect.Popup className="ui-select-popup">
            <BaseSelect.ScrollUpArrow className="ui-select-scroll-arrow">
              <ChevronDown size={14} aria-hidden="true" />
            </BaseSelect.ScrollUpArrow>
            <BaseSelect.List className="ui-select-list">
              {normalizedOptions.map(option => (
                <BaseSelect.Item key={String(option.value)} value={option.value} className="ui-select-item">
                  <BaseSelect.ItemIndicator className="ui-select-item-indicator">
                    <Check size={14} aria-hidden="true" />
                  </BaseSelect.ItemIndicator>
                  <BaseSelect.ItemText className="ui-select-item-text">{option.label}</BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
            <BaseSelect.ScrollDownArrow className="ui-select-scroll-arrow">
              <ChevronDown size={14} aria-hidden="true" />
            </BaseSelect.ScrollDownArrow>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  )
}

export const Option = () => null

export const Tabs = ({ activeKey, defaultActiveKey, onChange, items = [], className }) => (
  <BaseTabs.Root
    className={cx('ui-tabs', className)}
    value={activeKey}
    defaultValue={defaultActiveKey}
    onValueChange={(value) => onChange?.(value)}
  >
    <BaseTabs.List className="ui-tabs-list">
      {items.map(item => (
        <BaseTabs.Tab key={item.key} value={item.key} className="ui-tabs-tab">
          {item.label}
        </BaseTabs.Tab>
      ))}
      <BaseTabs.Indicator className="ui-tabs-indicator" />
    </BaseTabs.List>
    <div className="ui-tabs-panels">
      {items.map(item => (
        <BaseTabs.Panel key={item.key} value={item.key} className="ui-tabs-panel">
          {item.children}
        </BaseTabs.Panel>
      ))}
    </div>
  </BaseTabs.Root>
)

export const Tooltip = ({ title, children }) => (
  <BaseTooltip.Provider>
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner sideOffset={8}>
          <BaseTooltip.Popup className="ui-tooltip-popup">
            <BaseTooltip.Arrow className="ui-tooltip-arrow" />
            {title}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  </BaseTooltip.Provider>
)

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input ref={ref} className={cx('ui-input', className)} {...props} />
))

Input.displayName = 'Input'

Input.Password = React.forwardRef(({ className, ...props }, ref) => (
  <input ref={ref} type="password" className={cx('ui-input', className)} {...props} />
))

Input.Password.displayName = 'InputPassword'

export const TextArea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cx('ui-input ui-textarea', className)} {...props} />
))

TextArea.displayName = 'TextArea'

export const InputNumber = ({ value, defaultValue, onChange, min, max, step = 1, placeholder, disabled, className, style, ...props }) => (
  <NumberField.Root
    value={value}
    defaultValue={defaultValue}
    onValueChange={(nextValue) => onChange?.(nextValue)}
    min={min}
    max={max}
    step={step}
    disabled={disabled}
    className={cx('ui-number-field', className)}
    style={style}
    {...props}
  >
    <NumberField.Group className="ui-number-group">
      <NumberField.Decrement className="ui-number-stepper" aria-label="减少数值">
        <Minus size={13} aria-hidden="true" />
      </NumberField.Decrement>
      <NumberField.Input className="ui-input ui-number-input" placeholder={placeholder} />
      <NumberField.Increment className="ui-number-stepper" aria-label="增加数值">
        <Plus size={13} aria-hidden="true" />
      </NumberField.Increment>
    </NumberField.Group>
  </NumberField.Root>
)

const FormContext = createContext(null)

export const useForm = () => {
  const initialValuesRef = useRef({})
  const mergedValuesRef = useRef({})
  const [values, setValues] = useState({})
  const setFormValues = (updater) => {
    setValues(prev => {
      const nextValues = typeof updater === 'function' ? updater(prev) : updater
      mergedValuesRef.current = { ...initialValuesRef.current, ...nextValues }
      return nextValues
    })
  }

  return useMemo(() => ({
    getFieldValue: (name) => mergedValuesRef.current[name],
    getFieldsValue: () => mergedValuesRef.current,
    setFieldsValue: (nextValues) => setFormValues(prev => ({ ...prev, ...nextValues })),
    resetFields: () => {
      mergedValuesRef.current = { ...initialValuesRef.current }
      setValues({})
    },
    validateFields: async () => mergedValuesRef.current,
    _values: values,
    _setValues: setFormValues,
    _setInitialValues: (nextInitialValues) => {
      initialValuesRef.current = nextInitialValues || {}
      mergedValuesRef.current = { ...initialValuesRef.current, ...values }
    }
  }), [values])
}

export const Form = ({ form, children, initialValues = {}, disabled = false, className, onSubmit, layout: _layout, ...props }) => {
  const internalForm = useForm()
  const formInstance = form || internalForm
  const values = useMemo(() => ({ ...initialValues, ...formInstance._values }), [formInstance._values, initialValues])
  formInstance._setInitialValues?.(initialValues)

  const contextValue = useMemo(() => ({
    form: formInstance,
    values,
    disabled
  }), [disabled, formInstance, values])

  return (
    <form
      className={cx('ui-form', className)}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.(event)
      }}
      {...props}
    >
      <FormContext.Provider value={contextValue}>
        {children}
      </FormContext.Provider>
    </form>
  )
}

Form.useForm = function useUiFormInstance() {
  return [useForm()]
}

function FormItem({ children, label, name, rules = [], className }) {
  const context = useContext(FormContext)
  const value = name ? context?.values?.[name] : undefined
  const disabled = context?.disabled
  const required = rules.some(rule => rule.required)

  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        value: children.props.value ?? value,
        disabled: children.props.disabled ?? disabled,
        required: children.props.required ?? required,
        'aria-label': children.props['aria-label'] ?? (typeof label === 'string' ? label : undefined),
        onChange: (...args) => {
          const nextValue = args[0]?.target ? args[0].target.value : args[0]
          if (name) {
            context?.form?._setValues(prev => ({ ...prev, [name]: nextValue }))
          }
          children.props.onChange?.(...args)
        }
      })
    : children

  return (
    <div className={cx('ui-form-item', className)}>
      {label && <span className="ui-form-label">{label}{required && <span aria-hidden="true"> *</span>}</span>}
      {child}
    </div>
  )
}

Form.Item = FormItem

export const Descriptions = ({ items, children, className }) => (
  <dl className={cx('ui-descriptions', className)}>
    {items
      ? items.map(item => (
          <div key={item.key || item.label} className="ui-description-item">
            <dt>{item.label}</dt>
            <dd>{item.children}</dd>
          </div>
        ))
      : children}
  </dl>
)

function DescriptionItem({ label, children }) {
  return (
  <div className="ui-description-item">
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
  )
}

Descriptions.Item = DescriptionItem

const getNestedValue = (record, dataIndex) => {
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce((value, key) => value?.[key], record)
  }
  return record?.[dataIndex]
}

export const Table = ({
  dataSource = [],
  columns = [],
  rowKey,
  loading = false,
  pagination = false,
  className,
  scroll,
  size = 'middle'
}) => {
  const [page, setPage] = useState(pagination?.current || 1)
  const [pageSize, setPageSize] = useState(pagination?.pageSize || 10)
  const [pageAnimationKey, setPageAnimationKey] = useState(0)
  const [isPageTransitioning, setIsPageTransitioning] = useState(false)
  const rawTotal = pagination?.total ?? dataSource.length
  const previousTotalRef = useRef(rawTotal)

  if (!loading || rawTotal > 0) {
    previousTotalRef.current = rawTotal
  }

  const total = loading && rawTotal === 0 && previousTotalRef.current > 0
    ? previousTotalRef.current
    : rawTotal
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const isServerPage = Boolean(pagination?.current && total > dataSource.length)
  const pagedData = pagination && !isServerPage
    ? dataSource.slice((page - 1) * pageSize, page * pageSize)
    : dataSource
  const pageTransitionSignature = pagination ? `${page}-${pageSize}-${pageAnimationKey}` : 'static'

  useEffect(() => {
    if (!isPageTransitioning) return undefined
    if (loading) return undefined

    const timer = window.setTimeout(() => {
      setIsPageTransitioning(false)
    }, 280)

    return () => window.clearTimeout(timer)
  }, [isPageTransitioning, pageAnimationKey, loading])

  const beginPageTransition = () => {
    setPageAnimationKey(value => value + 1)
    setIsPageTransitioning(true)
  }

  const getKey = (record, index) => {
    if (typeof rowKey === 'function') return rowKey(record, index)
    if (typeof rowKey === 'string') return record[rowKey]
    return record.key ?? index
  }

  const changePage = (nextPage) => {
    const normalizedPage = Math.min(Math.max(nextPage, 1), pageCount)
    if (normalizedPage === page) return
    beginPageTransition()
    setPage(normalizedPage)
    pagination?.onChange?.(normalizedPage, pageSize)
  }

  const changePageSize = (event) => {
    const nextSize = Number(event.target.value)
    if (!Number.isFinite(nextSize) || nextSize === pageSize) return
    beginPageTransition()
    setPageSize(nextSize)
    setPage(1)
    pagination?.onShowSizeChange?.(page, nextSize)
    pagination?.onChange?.(1, nextSize)
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className={cx('ui-table-wrap', 'smart-table', className, `ui-table-${size}`)} aria-busy={loading || undefined}>
      <div className="ui-table-scroll" style={{ maxHeight: scroll?.y || undefined }}>
        <table className="ui-table">
          <thead>
            <tr>
              {columns.map(column => (
                <th key={column.key || column.dataIndex} style={{ width: column.width }}>
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            key={pageTransitionSignature}
            className={isPageTransitioning ? 'ui-table-page-transition' : undefined}
          >
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`loading-${index}`} style={{ '--row-index': index }}>
                  <td colSpan={columns.length}><span className="ui-table-skeleton" /></td>
                </tr>
              ))
            ) : pagedData.length > 0 ? (
              pagedData.map((record, rowIndex) => (
                <tr key={getKey(record, rowIndex)} style={{ '--row-index': rowIndex }}>
                  {columns.map(column => {
                    const value = getNestedValue(record, column.dataIndex)
                    return (
                      <td key={column.key || column.dataIndex}>
                        {column.render ? column.render(value, record, rowIndex) : value}
                      </td>
                    )
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="ui-table-empty">暂无数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="ui-pagination">
          <span className="ui-pagination-total">
            {pagination.showTotal ? pagination.showTotal(total, [from, to]) : `共 ${total} 条`}
          </span>
          {pagination.showSizeChanger && (
            <select className="ui-pagination-size" value={pageSize} onChange={changePageSize} aria-label="每页条数">
              {[10, 20, 50, 100].map(sizeOption => (
                <option key={sizeOption} value={sizeOption}>{sizeOption} / 页</option>
              ))}
            </select>
          )}
          <div className="ui-pagination-controls" aria-label="分页">
            <Button size="small" onClick={() => changePage(page - 1)} disabled={page <= 1}>上一页</Button>
            <span className="ui-pagination-page">{page} / {pageCount}</span>
            <Button size="small" onClick={() => changePage(page + 1)} disabled={page >= pageCount}>下一页</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export const SkeletonBlock = ({ rows = 3, className }) => (
  <div className={cx('ui-skeleton-block', className)}>
    {Array.from({ length: rows }).map((_, index) => (
      <span key={index} className="ui-skeleton-line" style={{ width: `${Math.max(42, 96 - index * 13)}%` }} />
    ))}
  </div>
)

export const Spinner = ({ size = 'middle', className }) => (
  <span className={cx('ui-spinner', `ui-spinner-${size}`, className)} aria-label="加载中" />
)

const MessageContext = createContext({
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {}
})

export const AppProvider = ({ children }) => {
  const [messages, setMessages] = useState([])

  const api = useMemo(() => {
    const push = (type, content) => {
      const id = `${Date.now()}-${Math.random()}`
      setMessages(prev => [...prev, { id, type, content }])
      window.setTimeout(() => {
        setMessages(prev => prev.filter(item => item.id !== id))
      }, 3000)
    }

    return {
      success: (content) => push('success', content),
      error: (content) => push('error', content),
      warning: (content) => push('warning', content),
      info: (content) => push('info', content)
    }
  }, [])

  return (
    <MessageContext.Provider value={api}>
      {children}
      <div className="ui-toast-region" aria-live="polite" aria-relevant="additions">
        {messages.map(item => (
          <div key={item.id} className={cx('ui-toast', `ui-toast-${item.type}`)}>{item.content}</div>
        ))}
      </div>
    </MessageContext.Provider>
  )
}

export const useMessage = () => useContext(MessageContext)
