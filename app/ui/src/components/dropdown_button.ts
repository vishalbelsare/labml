import {WeyaElementFunction, Weya as $} from '../../../lib/weya/weya'
import {Button, ButtonOptions} from './buttons'
import {clearChildElements} from "../utils/document"

export interface DropdownMenuItem {
    id: string
    title: string
    default?: boolean
}

interface DropdownMenuOptions extends ButtonOptions {
    onItemSelect: (id: string) => void
    items: DropdownMenuItem[]
    showSelectItem?: boolean
}

export class DropDownMenu extends Button {
    private listHidden: boolean

    private currentItem: DropdownMenuItem

    private overlayElem: HTMLDivElement
    private listContainer: HTMLDivElement
    private selectedItem: HTMLSpanElement

    private readonly onItemSelect: (id: string) => void
    private readonly tooltip: string
    private readonly items: DropdownMenuItem[]
    private readonly showSelectedItem: boolean

    constructor(opt: DropdownMenuOptions) {
        super(opt)

        this.showSelectedItem = opt.showSelectItem ? opt.showSelectItem : false
        this.items = opt.items
        this.onItemSelect = opt.onItemSelect
        this.listHidden = true
        if (this.items.length < 0) {
            throw new Error('No items in dropdown')
        }
        this.currentItem = opt.items[0]
        for (let item of this.items) {
            if (item.default) {
                this.currentItem = item
                break
            }
        }
    }

    onClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        this.listHidden = !this.listHidden
        if (this.listHidden) {
            this.listContainer.classList.add('hidden')
            this.overlayElem.classList.remove('d-block')
        } else {
            this.listContainer.classList.remove('hidden')
            this.overlayElem.classList.add('d-block')
        }
    }

    private onItemClick = (id: string) => {
        this.currentItem = this.items.find(item => item.id === id)
        if (this.showSelectedItem) {
            this.selectedItem.innerText = " : " + this.currentItem.title
        }
        this.renderList()

        this.onItemSelect(id)
        this.onClick(new Event('click'))
    }

    private renderList() {
        clearChildElements(this.listContainer)
        $(this.listContainer, $ => {
            this.items.forEach(value => {
                    $('div', '.dropdown-item', {
                        on: {
                            click: (e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                this.onItemClick(value.id)
                            }
                        },
                    }, $ => {
                        $('span', '.dropdown-menu-item', value.title, {
                            style : {
                                'font-weight': value.id === this.currentItem.id && this.showSelectedItem ? 'bold' : 'normal'
                            }
                        })
                    })
                })
        })
    }

    render($: WeyaElementFunction) {
        this.elem = $('div', '.dropdown-button', $ => {
            this.overlayElem = $('div', '.overlay.transparent', {on: {click: this.onClick}})
            $('nav', '.nav-link.float-left.tab.toggle-button',  {
                    on: {click: this.onClick}, title: this.tooltip
                }, $ => {
                if (this.title) {
                    $('span', '', this.title)
                }
                if (this.showSelectedItem)
                    this.selectedItem = $('span', '.selected-name', " : " + this.currentItem.title)
                $('i', '.fas.fa-chevron-down', '')
            })
            this.listContainer = $('div', `.dropdown-items${this.listHidden ? '.hidden' : ''}`, '')
        })
        this.renderList()
    }
}