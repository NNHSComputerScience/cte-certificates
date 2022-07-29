const express = require('express');
const route = express.Router()

const Student = require('../model/model');

const {OAuth2Client} = require('google-auth-library');
const CLIENT_ID = "1044226590904-o6i6sqk9j4lql9linthugs8bjt52cltl.apps.googleusercontent.com"
const oAuth2 = new OAuth2Client(CLIENT_ID);

// load certificate data
const certificates = require('../model/courses');

route.get('/', (req, res) => {
    res.render('index', {certificates: certificates});
});

route.post('/courses', async (req, res) => {
    var courseNames = req.body;

    console.log(courseNames);

    var courses = courseNames.map((course) => ({name: course}));
    console.log(courses);
    req.student.courses = courses;
    await req.student.save();

    res.status(201).end();
});

route.get('/certificates', (req, res) => {

    var earnedCertificates = [];

    console.log(req.student.courses);

    for(var department of certificates.departments) {
        for(var certificate of department.certificates) {
            var semesterCount = 0;
            for(var course of certificate.courses) {
                if(req.student.courses.some(elem => elem.name === course.name)) {
                    semesterCount += course.semesters;
                }
            }

            if(semesterCount >= certificate.semesters) {
                earnedCertificates.push(certificate);
            }
        }
    }

    // !!! what are the rules for exploratory certificates?

    res.render('certificates', {certificates: earnedCertificates});
});

route.post('/certificates', async (req, res) => {

    var certificateNames = req.body;

    console.log(certificateNames);

    var certificates = certificateNames.map((certificate) => ({name: certificate, year: 2023}));
    console.log(certificates);
    req.student.certificates = certificates;
    await req.student.save();

    res.status(201).end();
});

route.get('/confirmation', (req, res) => {

    res.render('confirmation', {certificates: req.student.certificates});
});

route.get('/login', (req, res) => {

    res.render('login');   
});

route.post('/auth/v1/google', async (req, res) => {

    let token = req.body.token; // Gets token from request body
    let ticket = await oAuth2.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID
    });

    let {sub, email, given_name, family_name } = ticket.getPayload();
    console.log(sub, email, given_name, family_name);
    let student = await getOrMakeStudent(sub, email, given_name, family_name);
    console.log(student);
    req.session.student_sub = student.sub;
    res.status(201).end();
});

async function getOrMakeStudent(sub, email, given_name, family_name) {
    var student = await Student.findOne({sub: sub}); //see if a user exists with their google account
    if (!student) { //we are certain the user doesn't exist yet, let's make them from scratch
        student = new Student({
            sub: sub,
            email: email,
            given_name: given_name,
            family_name: family_name,
            courses: [],
            certificates: []
        });
        await student.save(); // insert the user into the collection
    }
    
    return student; //return the user (either newly made or updated)
}

module.exports = route