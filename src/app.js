const path = require('path')
const express = require('express')
const fileUpload = require('express-fileupload')
const Tesseract = require('tesseract.js')
const parse = require('mrz').parse
const fs = require('fs')

const app = express()

app.use(fileUpload())

app.use('/', express.static(path.join(__dirname, '../public')))

app.post('/upload', async (req, res) => {
	console.log('UPLOAD CALLED!')

	if (!req.files || Object.keys(req.files).length === 0) {
		return res.status(400).send('No files were uploaded.')
	}

	let sampleFile = req.files.sampleFile
	if (!fs.existsSync(path.join(__dirname, '../images'))) {
		fs.mkdirSync(path.join(__dirname, '../images'), 0744)
	}
	let imgPath = path.join(__dirname, '../images/image.jpg')

	sampleFile.mv(imgPath, (err) => {
		if (err) return res.status(500).send(err)

		const TESSERACT_CONFIG = {
			lang: 'OCRB',
			load_system_dawg: 'F',
			load_freq_dawg: 'F',
			load_unambig_dawg: 'F',
			load_punc_dawg: 'F',
			load_number_dawg: 'F',
			load_fixed_length_dawgs: 'F',
			load_bigram_dawg: 'F',
			wordrec_enable_assoc: 'F',
			tessedit_pageseg_mode: '6',
			tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
		}

		Tesseract.create({
			langPath: path.join(__dirname, '../lang-data'),
		})

		Tesseract.recognize(imgPath, TESSERACT_CONFIG)
			.progress((message) => {
				//console.log(`${Math.round(message.progress * 100)}%`)
			})
			.then((result) => {
				// console.log(result)
				const lines = result.lines
					.map((line) => line.text)
					.map((text) => text.replace(/ |\r\n|\r|\n/g, ''))
					.filter((text) => text.includes('<<'))
					.filter((text) => text.length < 48)
					.filter((text) => text.length > 28)
				// console.log(lines)
				//contentArea.value = lines.join('\r\n')
				// check()

				try {
					parse(lines).then((result) => {
						res.send({ status: 'success', lines, result })
					})
				} catch (e) {
					console.log(e.message)
					res.status(500).send({ status: 'error', result: e.message })
				}
			})
			.catch((err) => console.error(err))
	})
})

app.listen(process.env.PORT || 3000, () => {
	console.log('Test app listening on port ' + (process.env.PORT || 3000) + '!')
})
