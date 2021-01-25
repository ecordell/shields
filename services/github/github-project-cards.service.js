'use strict'

const Joi = require('joi')
const { GithubAuthV3Service } = require('./github-auth-service')
const { documentation, errorMessagesFor } = require('./github-helpers')

const projectsSchema = Joi.array()
  .items(
    Joi.object({
      state: Joi.string().required(),
      name: Joi.string().required(),
      number: Joi.number().required(),
      id: Joi.number().required(),
    }).required()
  )
  .required()

const columnSchema = Joi.array()
  .items(
    Joi.object({
      name: Joi.string().required(),
      id: Joi.number().required(),
    }).required()
  )
  .required()

const cardsSchema = Joi.array()
  .items(
    Joi.object({
      id: Joi.number().required(),
    })
  )
  .min(0)
  .required()

module.exports = class GithubProjectCardsDetail extends GithubAuthV3Service {
  static category = 'issue-tracking'
  static route = {
    base: 'github/projects',
    pattern: ':org/:project_id([0-9]+)/cards',
  }

  static examples = [
    {
      title: 'GitHub project cards',
      namedParams: {
        org: 'github',
        project_id: '1',
      },
      staticPreview: {
        label: 'project',
        message: 'Todo: 4, In progress: 0, Done: 0',
        color: 'red',
      },
      documentation,
    },
  ]

  static defaultBadgeData = { label: 'project', color: 'informational' }

  static render({ org, project, columns }) {
    let color = 'blue'

    switch (project.state) {
      case 'open':
        color = 'red'
        break
      case 'closed':
        color = 'green'
        break
    }

    return {
      label: `${project.name}`,
      message: columns
        .map(column => `${column.name}: ${column.count}`)
        .join(', '),
      color,
      link: [`https://github.com/orgs/${org}/projects/${project.number}/`],
    }
  }

  async fetchProject({ org }) {
    return this._requestJson({
      url: `/orgs/${org}/projects`,
      schema: projectsSchema,
      errorMessages: errorMessagesFor(`org not found`),
    })
  }

  async fetchColumns({ project_id }) {
    return this._requestJson({
      url: `/projects/${project_id}/columns`,
      schema: columnSchema,
      errorMessages: errorMessagesFor(`project not found`),
    })
  }

  async fetchCards({ column_id }) {
    return this._requestJson({
      url: `/projects/columns/${column_id}/cards`,
      schema: cardsSchema,
      errorMessages: errorMessagesFor(`column not found`),
    })
  }

  async handle({ org, project_id }) {
    const projects = await this.fetchProject({ org })
    const project = projects.filter(p => p.number === project_id)[0]
    const columns = await this.fetchColumns({ project_id: project.id })

    await Promise.all(
      columns.map(async column => {
        const cards = await this.fetchCards({ column_id: column.id })
        column.count = cards.length
      })
    )

    return this.constructor.render({ org, project, columns })
  }
}
