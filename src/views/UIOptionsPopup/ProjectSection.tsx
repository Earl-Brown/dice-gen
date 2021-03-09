import React from 'react'
import {
  useGlobalState,
  getGlobalState,
  resetGlobalState,
  restoreGlobalState,
  subscribeToAllChanges,
} from '../../modules/global'
import { fileOpen, fileSave } from 'browser-fs-access'
import debounce from 'debounce'

// components
import { Button, Row, Col, notification } from 'antd'
import { ValueCheckbox } from '../Controls/Controls'

const notify = (title, description) =>
  notification.open({
    message: title,
    description: description,
    duration: 3,
  })

const readFileAsTextAsync = async file =>
  new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result)
    }
    reader.readAsText(file)
  })

const readFileAsObjectAsync = async file =>
  new Promise(async resolve => {
    const json = await readFileAsTextAsync(file)
    resolve(JSON.parse(json.toString()))
  })

const loadProject = async () => {
  try {
    const blob = await fileOpen({
      mimeTypes: ['applicaiton/json'],
      extensions: ['.json'],
      multiple: false,
      description: 'DiceGen project file',
    })

    if (blob) {
      const projectConfiguration = await readFileAsObjectAsync(blob)
      restoreGlobalState(projectConfiguration['settings'])
    }
  } catch (ex) {
    notify(`Unable to load project`, ex)
  }
}

let projectFileHandle = undefined

const createBlobFromString = str => new Blob([str], { type: 'application/json' })

const prepareSettingsForSaving = settings => {
  settings['autoSaveProject'] = 0
  const json = JSON.stringify(settings, undefined, 2)
  return createBlobFromString(json)
}

const saveProject = async (projectName?: string) => {
  try {
    const settings = getGlobalState()
    const blobToSave = prepareSettingsForSaving(settings)
    const fileName = (projectFileHandle && projectFileHandle.fileName) || `${settings.projectName}.json`

    projectFileHandle = await fileSave(
      blobToSave,
      {
        fileName: fileName,
        extensions: ['.json'],
      },
      projectFileHandle,
    )

    notify('Project saved successfully', `your project has been saved to ${projectFileHandle.name}`)
  } catch (ex) {
    notify('Unable to save project', ex.message)
  }
}

setTimeout(() =>
  subscribeToAllChanges(
    debounce(async () => {
      const { autosaveProject } = getGlobalState()
      if (!autosaveProject) return
      try {
        await saveProject()
      } catch (ex) {}
    }, 1000),
  ),
)

type Props = {}

/**
 * This component renders the font selection options at the top of the right panel. By default this displays the
 * dropdown of all the google fonts as well as a button that switches to upload font mode. This sets the property
 * globalFontUploadActive to true in the google state which switches this component to render a font file dropzone
 * instead with a button that resets the state back to the font dropdown.
 * @constructor
 */
const ProjectSection: React.FC<Props> = () => {
  const [, setAutoSave] = useGlobalState('autosaveProject')
  const [projectName] = useGlobalState('projectName')

  const newProject = () => {
    if (!confirm('Are you sure - this will reset to factory defaults?')) return

    resetGlobalState()
    projectFileHandle = undefined
  }

  const loadProjectAndNotify = () => {
    loadProject().then(() => {
      setAutoSave(0)
      notify(
        'Project loaded',
        'The project loaded successfully, but due to browser restrictions, you must save your project again before autosave can be enabled.',
      )
    })
  }

  return (
    <>
      <h4>Manage Project:</h4>
      <Row>
        <Col span={18}>
          <Button style={{ marginRight: '3px' }} title="Create a new project" onClick={() => newProject()}>
            New
          </Button>
          <Button style={{ marginRight: '3px' }} title="Load a saved project" onClick={() => loadProjectAndNotify()}>
            Load
          </Button>
          <Button style={{ marginRight: '3px' }} title="Save your project" onClick={() => saveProject(projectName)}>
            Save
          </Button>
        </Col>
        <Col span={6}>
          <ValueCheckbox stateKey="autosaveProject" label="Autosave" />
        </Col>
      </Row>
    </>
  )
}

export default ProjectSection
