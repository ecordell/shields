'use strict'

const Joi = require('joi')
const { GithubAuthV3Service } = require('./github-auth-service')
const { documentation, errorMessagesFor } = require('./github-helpers')

const schema = Joi.array()
  .items(
    Joi.object({
      state: Joi.string().required(),
      name: Joi.string().required(),
      number: Joi.number().required(),
      id: Joi.number().required(),
    }).required()
  )
  .required()

module.exports = class GithubProjectDetail extends GithubAuthV3Service {
  static category = 'issue-tracking'
  static route = {
    base: 'github/projects',
    pattern: ':org/:project_id([0-9]+)',
  }

  static examples = [
    {
      title: 'GitHub project',
      namedParams: {
        org: 'github',
        project_id: '1',
      },
      staticPreview: {
        label: 'project',
        message: 'open',
        color: 'red',
      },
      documentation,
    },
  ]

  static defaultBadgeData = { label: 'project', color: 'informational' }

  static render({ org, project }) {
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
      message: project.state,
      color,
      link: [`https://github.com/orgs/${org}/projects/${project.number}/`],
    }
  }

  async fetch({ org }) {
    return this._requestJson({
      url: `/orgs/${org}/projects`,
      schema,
      errorMessages: errorMessagesFor(`org not found`),
    })
  }

  async handle({ org, project_id }) {
    const projects = await this.fetch({ org })
    const project = projects.filter(p => p.number === project_id)[0]
    return this.constructor.render({ org, project })
  }
}
