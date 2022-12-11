// Function to load profil from json
$(document).ready(function() {
	$.getJSON("jsons/profil.json", function(data){
		$("#myname").append(data.name);
		$("#mytitle").append(data.title);
		$("#img-profil").attr("src", data.image);
		$("#abstract").append(data.abstract);
		for (var i=0; i<data.keywords.length; i++){
			if (i<data.keywords.length-1){
				$("#keywords").append(data.keywords[i] + ', ');
			}else{
				$("#keywords").append(data.keywords[i] + '.');
			}
		}
		$("#address").append(data.contact.employer + '<br>' + data.contact.street + '<br>' + data.contact.city + '<br>');
		$("#email").append(data.contact.email);
		$("#phone").append(data.contact.phone);
		// External links if exist
		var idstring;
		$.each(data.links, function(key,val){
			idstring='#' + key;
			$(idstring+ ' a').attr("href", val);
			$(idstring).show();
		});
	});
});

// Function to load news from json
$(document).ready(function() {
    $.getJSON("jsons/news.json", function(data){
    	var numToshow=5;
    	var newsdict = data.news;
    	for (var i=0; i< newsdict.length; i++){
    		if (i<numToshow){
    			$("#list-news").append( "<li style=\"display: list-item;\"><B>" + newsdict[i].date + ":</B> " + newsdict[i].content + "</li>" );
    		}else{
    			$("#list-news").append( "<li style=\"display: none;\"><B>" + newsdict[i].date + ":</B> " + newsdict[i].content + "</li>" );
    		}
    		
    	}

    	// + or -
    	size_li = $("#list-news li").length;
    	x = numToshow;
    	$('#see-more').click(function () {
	        x= (x+1 <= size_li) ? x+5 : size_li;
	        $('#list-news li:lt('+x+')').show();
	    });
	    $('#see-less').click(function () {
	        x=(x-5<0) ? 5 : x-5;
	        x= (x<= 5) ? 5 : x;
	        $('#list-news li').not(':lt('+x+')').hide();
	    });
    });
});



// Function to load bio from json
$(document).ready(function(){
	$.getJSON("jsons/bio.json", function(data){
		// background
		// for (var i=0; i<data.background.length; i++){
		// 	employ_string='';
		// 	for (e=0; e<data.background[i].employer.length; e++){
		// 		if (e>0){
		// 			if (e==(data.background[i].employer.length-1)){
		// 				employ_string = employ_string + ' and ';
		// 			}else{
		// 				employ_string = employ_string + ', ';
		// 			}
		// 		}
		// 		employ_string = employ_string + '<a href="' + data.background[i].employer_links[e] + '" target="_blank"> ' + data.background[i].employer[e] + '</a>';
		// 	}
		// 	$("#background").append('<li><B>' + data.background[i].date + ':</B> ' + data.background[i].position + ' at ' + employ_string + '</li>');
		// }

		// education
		for (var i=0; i<data.education.length; i++){
			school_string='';
			for (e=0; e<data.education[i].school.length; e++){
				if (e>0){
					if (e==(data.education[i].school.length-1)){
						school_string = school_string + ' and ';
					}else{
						school_string = school_string + ', ';
					}
				}
				school_string = school_string + '<a href="' + data.education[i].school_links[e] + '" target="_blank"> ' + data.education[i].school[e] + '</a>';
			}
			$("#education").append('<li><B>' + data.education[i].date + ':</B> ' + data.education[i].degree + ' at ' + school_string + '</li>');
		}

		// responsabilities
		// for (var i=0; i<data.responsabilities.length; i++){
		// 	$("#responsabilities").append('<li><B>'+ data.responsabilities[i].date + ': </B>' + data.responsabilities[i].resp + '</li>');
		// }

		// sub-reviewer
		for (var i=0; i<data.subreviewer.length; i++){
			$("#sub-reviewer").append('<li>'+ data.subreviewer[i] + '</li>');
		}

		// committee
		// for (var i=0; i<data.committee.length; i++){
		// 	$("#committee").append('<li>'+ data.committee[i] + '</li>');
		// }

		//skills
		for (var i=0; i<data.skills.length; i++){
			skill_string=""
			for (var e=0; e<data.skills[i].detailed_skill.length; e++){
				if (e>0){
					if (e==data.skills[i].detailed_skill.length-1){
						skill_string = skill_string + ' and ';
					}else{
						skill_string = skill_string + ', ';
					}
				}
				if (data.skills[i].detailed_skill_link.length == 0){
					skill_string = skill_string + data.skills[i].detailed_skill[e];
				}
				else{
					skill_string = skill_string + '<a href="' + data.skills[i].detailed_skill_link[e] + '">' + data.skills[i].detailed_skill[e] + '</a>';
				}
			}
			$("#skills").append('<li>'+ data.skills[i].skill + ': '+ skill_string + '</li>');
		}

		// experience
		for(var i=0; i<data.experience.length; i++){
			experience_place_string = "";
			for(var j=0; j<data.experience[i].places.length; j++){
				if (j>0){
					if (j==data.experience[i].places.length-1){
						experience_place_string = experience_place_string + ' and ';
					}
					else{
						experience_place_string = experience_place_string + ', ';
					}
				}
				experience_place_string = experience_place_string + '<a href="' + data.experience[i].places_links[j] + '">' + data.experience[i].places[j] + '</a>';
			}
			experience_supervisor_string = "";
			for(var j=0; j<data.experience[i].supervisors.length; j++){
				if (j>0){
					if (j==data.experience[i].supervisors.length-1){
						experience_supervisor_string = experience_supervisor_string + ' and ';
					}
					else{
						experience_supervisor_string = experience_supervisor_string + ', ';
					}
				}
				experience_supervisor_string = experience_supervisor_string + '<a href="' + data.experience[i].supervisors_links[j] + '">' + data.experience[i].supervisors[j] + '</a>';
			}
			$("#experience").append('<li>' + data.experience[i].date + ' <span>•</span> ' + 'A ' + data.experience[i].duration + ' ' + data.experience[i].type + ' at ' + experience_place_string + ' about ' + data.experience[i].about + '. Supervised by ' + experience_supervisor_string)
		}
	});
});

// Function to load activities from json

$(document).ready(function(){
	$.getJSON("jsons/activities.json", function(data){
		// certificates
		for(var i=0; i<data.certificats.length; i++){
			$("#certificats").append('<li>' + data.certificats[i].date + ' <span>•</span> ' + data.certificats[i].content)
		}

		// awards
		for(var i=0; i<data.awards.length; i++){
			$("#awards").append('<li>' + data.awards[i].date + ' <span>•</span> ' + data.awards[i].content)
		}
	});
});

// Function to load projects from json
$(document).ready(function(){
	$.getJSON("jsons/projects.json", function(data){
		//current
		for (var i=0; i<data.current.length; i++){
			partner_string='';
			if (data.current[i].partners.length>0){
				partner_string = ' In collaboration with ';
				for (e=0; e<data.current[i].partners.length; e++){
					if (e>0){
						if (e==(data.current[i].partners.length-1)){
							partner_string = partner_string + ' and ';
						}else{
							partner_string = partner_string + ', ';
						}
					}
					partner_string = partner_string + '<a href="' + data.current[i].partners_links[e] + '" target="_blank">' + data.current[i].partners[e] + '</a>';
				}
				partner_string = partner_string + '.';
			}
			if (data.current[i].link != ''){
				projet_string='<B><a href="' + data.current[i].link + '" target="_blank">' + data.current[i].name + '</a> (' + data.current[i].date + '):</B> ' + data.current[i].topic + '. ';
			}else{
				projet_string='<B><a href="#research">' + data.current[i].name + '</a> (' + data.current[i].date + '):</B> ' + data.current[i].topic + '. ';
			}
			role_string='';
			if (data.current[i].role != ''){
				role_string = '<br><B>Role</B>: ' + data.current[i].role + '.'; 
			}
			funding_string='';
			if (data.current[i].fundings != ''){
				funding_string = ' <B>Fundings</B>: ' + data.current[i].fundings + '.'; 
			}
			$("#projects-current").append('<li>' + projet_string + role_string + partner_string + funding_string + '</li>');
		}

		// past
		for (var i=0; i<data.past.length; i++){
			partner_string='';
			if (data.past[i].partners.length>0){
				partner_string = '(';
				for (e=0; e<data.past[i].partners.length; e++){
					if (e>0){
						if (e==(data.past[i].partners.length-1)){
							partner_string = partner_string + ' and ';
						}else{
							partner_string = partner_string + ', ';
						}
					}
					partner_string = partner_string + '<a href="' + data.past[i].partners_links[e] + '" target="_blank">' + data.past[i].partners[e] + '</a>';
				}
			}
			if (data.past[i].link != ''){
				projet_string='<B><a href="' + data.past[i].link + '" target="_blank">' + data.past[i].name + '</a> (' + data.past[i].date + '):</B> ' + data.past[i].topic + '. ';
			}else{
				projet_string='<B><a href="#research">' + data.past[i].name + '</a> (' + data.past[i].date + '):</B> ' + data.past[i].topic + ' ';
			}
			funding_string='';
			if (data.past[i].fundings != ''){
				funding_string = ' <B>Fundings</B>: ' + data.past[i].fundings + '.'; 
			}
			$("#projects-past").append('<li>' + projet_string + partner_string + ').' + funding_string + '</li>');
		}
	});
});

// Function to load students from json
$(document).ready(function(){
	$.getJSON("jsons/students.json", function(data){
		//phd
		for (var i=0; i<data.phd.length; i++){
			partner_string='';
			if (data.phd[i].partners.length>0){
				if (data.phd[i].hasOwnProperty('enterprise')){
					enterprise_string = '<br>In collaboration with <a href="' + data.phd[i].enterprise_link + '" target="_blank">' + data.phd[i].enterprise + '</a>, ';
					partner_string = enterprise_string + 'co-advised with ';
				}
				else{
					partner_string = '<br>Co-advised with ';
				}
				for (e=0; e<data.phd[i].partners.length; e++){
					if (e>0){
						if (e==(data.phd[i].partners.length-1)){
							partner_string = partner_string + ' and ';
						}else{
							partner_string = partner_string + ', ';
						}
					}
					partner_string = partner_string + '<a href="' + data.phd[i].partners_links[e] + '" target="_blank">' + data.phd[i].partners[e] + '</a>';
				}
			}
			if (data.phd[i].link != ''){
				student_string='<B><a href="' + data.phd[i].link + '" target="_blank">' + data.phd[i].name + '</a></B>' + ' <B>(' + data.phd[i].date + '):</B> ' + data.phd[i].topic + '. ';
			}else{
				student_string='<B><a href="#research">' + data.phd[i].name + '</a></B>' + ' <B>(' + data.phd[i].date + '):</B> ' + data.phd[i].topic + '. ';
			}
			$("#students-phd").append('<li>' + student_string + partner_string + '.</li>');
		}
		//graduated
		for (var i=0; i<data.graduated.length; i++){
			partner_string='';
			if (data.graduated[i].partners.length>0){
				partner_string = 'Co-advised with ';
				for (e=0; e<data.graduated[i].partners.length; e++){
					if (e>0){
						if (e==(data.graduated[i].partners.length-1)){
							partner_string = partner_string + ' and ';
						}else{
							partner_string = partner_string + ', ';
						}
					}
					partner_string = partner_string + '<a href="' + data.graduated[i].partners_links[e] + '" target="_blank">' + data.graduated[i].partners[e] + '</a>';
				}
			}
			if (data.graduated[i].new_position != ''){
				new_position_string = 'Now ' + data.graduated[i].new_position + ' at <a href="' + data.graduated[i].new_compagny_link + '" target="_blank">' + data.graduated[i].new_compagny + '</a>';
			}
			else{
				new_position_string = '';
			}
			if (data.graduated[i].link != ''){
				student_string='<B><a href="' + data.graduated[i].link + '" target="_blank">' + data.graduated[i].name + '</a></B>' + ' <B>(PhD ' + data.graduated[i].date + '),</B> ' + partner_string + '. ' + new_position_string;
			}else{
				student_string='<B><a href="#research">' + data.graduated[i].name + '</a></B>' + ' <B>(PhD ' + data.graduated[i].date + '),</B> ' + partner_string + '. ' + new_position_string;
			}
			$("#graduated-phd").append('<li>' + student_string + '.</li>');
		}
		// postdocs
		for (var i=0; i<data.postdoc.length; i++){
			partner_string='<br>Co-supervised with ';
			for (e=0; e<data.postdoc[i].partners.length; e++){
				if (e>0){
					if (e==(data.postdoc[i].partners.length-1)){
						partner_string = partner_string + ' and ';
					}else{
						partner_string = partner_string + ', ';
					}
				}
				partner_string = partner_string + '<a href="' + data.postdoc[i].partners_links[e] + '" target="_blank">' + data.postdoc[i].partners[e] + '</a>';
			}
			if (data.postdoc[i].link != ''){
				student_string='<B><a href="' + data.postdoc[i].link + '" target="_blank">' + data.postdoc[i].name + '</a></B>' + ' <B>(' + data.postdoc[i].date + '):</B> Working on ' + data.postdoc[i].project + ' project. ';
			}else{
				student_string='<B><a href="#research">' + data.postdoc[i].name + '</a></B>' + ' <B>(' + data.postdoc[i].date + '):</B> Working on ' + data.postdoc[i].project + ' project. ';
			}
			$("#students-postdocs").append('<li>' + student_string + partner_string + '.</li>');
		}
		// engineers/masters
		for (var i=0; i<data.master.length; i++){
			partner_string='<br>Co-supervised with ';
			for (e=0; e<data.master[i].partners.length; e++){
				if (e>0){
					if (e==(data.master[i].partners.length-1)){
						partner_string = partner_string + ' and ';
					}else{
						partner_string = partner_string + ', ';
					}
				}
				partner_string = partner_string + '<a href="' + data.master[i].partners_links[e] + '" target="_blank">' + data.master[i].partners[e] + '</a>';
			}
			if (data.master[i].link != ''){
				student_string='<B><a href="' + data.master[i].link + '" target="_blank">' + data.master[i].name + '</a></B>' + ' <B>(' + data.master[i].date + '):</B> ' + data.master[i].topic + '.';
			}else{
				student_string='<B><a href="#research">' + data.master[i].name + '</a></B>' + ' <B>(' + data.master[i].date + '):</B> ' + data.master[i].topic + '.';
			}
			$("#students-masters").append('<li>' + student_string + partner_string + '.</li>');
		}
		// graduated
	});
});

// Function to load teaching from json
$(document).ready(function(){
	$.getJSON("jsons/teaching.json", function(data){
		// institutions
		for (var i=0; i<data.institutions.length; i++){
			school_string=data.institutions[i].school;
			if (data.institutions[i].link != ''){
				school_string = '<a href="' + data.institutions[i].link + '" target="blank_">' + school_string + '</a>';
			}
			if (data.institutions[i].info != ''){
				school_string = school_string + ' (' + data.institutions[i].info + ')';
			}
			$("#institutions").append('<li><B>' + data.institutions[i].date + ':</B> ' + school_string + ', ' + data.institutions[i].department + '.</li>');
		}

		// courses
		for (var i=0; i<data.courses.length; i++){
			index_list = (i % 3) +1;
			list_id = '#courses' + index_list;
			$(list_id).append('<li>' + data.courses[i] + '</li>');
		}
	});
});


// Function to load demos from json
$(document).ready(function(){
	$.getJSON("jsons/portfolio.json", function(data){
		// for (var i=0; i<data.demos.length; i++){
		// 	$("#demos-content").append('<div"><h4 class="vertical-title-bar">' + data.demos[i].title + '</h4></div>');
		// 	$("#demos-content").append('<p class="text-justify">' + data.demos[i].description + '</p>');
		// 	div_demo = 'row_demo' + i;
		// 	$("#demos-content").append('<div id="' + div_demo + '" class="row justify-content-center align-items-center"></div');
		// 	$('#'+div_demo).append('<div class="col-md-5"><iframe loading="lazy" width="294" height="220" src="' + data.demos[i].video_src + '" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>');
		// 	if (data.demos[i].img_legend  != '') {
		// 		$('#'+div_demo).append('<div class="col-md-5"><img width="300rem" src="' + data.demos[i].img_legend + '"></div>');
		// 	}
		// 	$("#demos-content").append('<br><br>');
		// }
		for(var i=0; i<data.projects.length; i++){
			// if(i%2 == 0){
			// }
			$("#portfolio-content").append('<div><h4 class="vertical-title-bar bg-info sec-title">' + data.projects[i].title + '</h4>');
			$("#portfolio-content").append('<a href=' + data.projects[i].link + '><img src=' + data.projects[i].image_source + ' class="portfolio-image"> </a>');
			$("#portfolio-content").append('<p class="text-justify">' + data.projects[i].description + '</p></div>');
		}
	});
});

// Function to read bib and display publications
$(document).ready(function(){
	$.get('publis/my_publis.bib', function(data) {
   	res = bibtexParse.toJSON(data);
	
	cptIntArticle=0;
	cptIntConf=0;
	cptChapter=0;
	cptNatConf=0;

	for (i=0; i<res.length; i++){
		// authors
		authors_string='';
		authors = res[i].entryTags.author.split(' and ');
		for (a=0; a<authors.length-1; a++){
			names = authors[a].split(', ');
			if (names[0] == 'Ismail-Fawaz'){
				authors_string = authors_string + '<B>' + names[1] + ' ' + names[0] + '</B>, ';
			}else{
				authors_string = authors_string + names[1] + ' ' + names[0] + ', ';
			} 
		}
		authors_string = authors_string.substring(0, authors_string.length - 2);
		names = authors[authors.length-1].split(', ');
		if (names[0] == 'Ismail-Fawaz'){
			authors_string = authors_string + ' and ' + '<B>' + names[1] + ' ' + names[0] + '</B>';
		}else{
			authors_string = authors_string + ' and ' + names[1] + ' ' + names[0];
		}
		link_string='<div class="bib">';
		if (res[i].entryTags.hasOwnProperty('pdf')){
			link_string = link_string + '<a href="' + res[i].entryTags.pdf + '" target="blank_"><i class="fas fa-file-pdf-o"></i></a> ';
		}
		if (res[i].entryTags.hasOwnProperty('url')){
			link_string = link_string + '<a href="' + res[i].entryTags.url + '" target="blank_"><i class="fas fa-link"></i></a> ';
		}
		
		link_string += '<a href="javascript: toggleInfos(\'' + res[i].citationKey + '\',\'bibtex\')">[BibTex]</a>';
		
		if (res[i].entryTags.hasOwnProperty('code')){
			link_string += ' <a href="' + res[i].entryTags.code + '" target="blank_"><i class="fab fa-github-square"></i></a>';
		}
		if (res[i].entryTags.hasOwnProperty('slides')) {
			link_string = link_string + '<a href="' + res[i].entryTags.slides + '" targer="bkank_"><i class="fab fa-slideshare"></i></a>'
		}
		if (res[i].entryTags.hasOwnProperty('webpage')){
			link_string = link_string + '<a href="' + res[i].entryTags.webpage + '" target="blank_">[webpage]</a>'
		}

		link_string += '</div>'

		if (res[i].entryType == "article"){
			// article
			cptIntArticle++;
			num_string = '';
			if (res[i].entryTags.number != ''){
				num_string = '(' + res[i].entryTags.number + ') ';
			}
			res[i].entryTags.pages = res[i].entryTags.pages.replace("--", "-")
			publi_string = authors_string + '.<br>' + res[i].entryTags.title + '.<br><i>' + res[i].entryTags.journal + ', Vol. ' + res[i].entryTags.volume + num_string + ', pp. ' + res[i].entryTags.pages + ', ' + res[i].entryTags.year +'.</i><br>' + link_string;
			$("#int_journals").append('<tr id="' + res[i].citationKey + '" class="entry"><td style="width:40px;padding-right:1em;">[' + cptIntArticle + ']</td><td>' + publi_string + '</td></tr>');
			$("#int_journals").append('<tr id="bib_' + res[i].citationKey + '" class="bibtex noshown"><td style="width:40px"></td><td class="bibtex-col"><pre>\n@article{' + res[i].citationKey + ',\n  author = {' + res[i].entryTags.author + '},\n  title = {' + res[i].entryTags.title + '},\n  journal = {' + res[i].entryTags.journal + '},\n  volume = {' + res[i].entryTags.volume + '},\n  number = {' + res[i].entryTags.number + '},\n  pages = {' + res[i].entryTags.pages + '},\n  url = {' + res[i].entryTags.url + '},\n  year = {'+ res[i].entryTags.year + '},\n  publisher = {' + res[i].entryTags.publisher + '}\n}' + '</td></tr>');
		}else if (res[i].entryType == 'inproceedings'){
			if ((res[i].entryTags.hasOwnProperty('language')) && (res[i].entryTags.language == 'french')){
				// national conf
				cptNatConf++;
				publi_string = authors_string + '.<br>' + res[i].entryTags.title + '.<br><i>' + res[i].entryTags.booktitle + ', ' + res[i].entryTags.city + ', ' + res[i].entryTags.country + ', ' + res[i].entryTags.year +'.</i><br>' + link_string;
				$("#nat_confs").append('<tr id="' + res[i].citationKey + '" class="entry"><td style="width:40px;padding-right:1em;">[' + cptNatConf + ']</td><td>' + publi_string + '</td></tr>');
				$("#nat_confs").append('<tr id="bib_' + res[i].citationKey + '" class="bibtex noshown"><td style="width:40px"></td><td class="bibtex-col"><pre>\n@inproceedings{' + res[i].citationKey + ',\n  author = {' + res[i].entryTags.author + '},\n  title = {' + res[i].entryTags.title + '},\n  booktitle = {' + res[i].entryTags.booktitle + '},\n  city = {' + res[i].entryTags.city + '},\n  country = {' + res[i].entryTags.country + '},\n  pages = {' + res[i].entryTags.pages + '},\n  url = {' + res[i].entryTags.url + '},\n  year = {'+ res[i].entryTags.year + '},\n  organization = {' + res[i].entryTags.organization + '}\n}' + '</td></tr>');
			}else{
				// international conf
				cptIntConf++;
				publi_string = authors_string + '.<br>' + res[i].entryTags.title + '.<br><i>' + res[i].entryTags.booktitle + ', ' + res[i].entryTags.city + ', ' + res[i].entryTags.country + ', ' + res[i].entryTags.year +'.</i><br>' + link_string;
				$("#int_confs").append('<tr id="' + res[i].citationKey + '" class="entry"><td style="width:40px;padding-right:1em;">[' + cptIntConf + ']</td><td>' + publi_string + '</td></tr>');
				$("#int_confs").append('<tr id="bib_' + res[i].citationKey + '" class="bibtex noshown"><td style="width:40px"></td><td class="bibtex-col"><pre>\n@inproceedings{' + res[i].citationKey + ',\n  author = {' + res[i].entryTags.author + '},\n  title = {' + res[i].entryTags.title + '},\n  booktitle = {' + res[i].entryTags.booktitle + '},\n  city = {' + res[i].entryTags.city + '},\n  country = {' + res[i].entryTags.country + '},\n  pages = {' + res[i].entryTags.pages + '},\n  url = {' + res[i].entryTags.url + '},\n  year = {'+ res[i].entryTags.year + '},\n  organization = {' + res[i].entryTags.organization + '}\n}' + '</td></tr>');
			}
		}else if (res[i].entryType == 'inbook'){
			// book chapter
			cptChapter++;
			publi_string = authors_string + '.<br>' + res[i].entryTags.title + '.<br><i>' + res[i].entryTags.booktitle + ', pp.' + res[i].entryTags.pages + ', ' + res[i].entryTags.year +'.</i><br>' + link_string;
			$("#chapters").append('<tr id="' + res[i].citationKey + '" class="entry"><td style="width:40px;padding-right:1em;">[' + cptChapter + ']</td><td>' + publi_string + '</td></tr>');
			$("#chapters").append('<tr id="bib_' + res[i].citationKey + '" class="bibtex noshown"><td style="width:40px"></td><td class="bibtex-col"><pre>\n@inbook{' + res[i].citationKey + ',\n  author = {' + res[i].entryTags.author + '},\n  title = {' + res[i].entryTags.title + '},\n  booktitle = {' + res[i].entryTags.booktitle + '},\n  pages = {' + res[i].entryTags.pages + '},\n  url = {' + res[i].entryTags.url + '},\n  year = {'+ res[i].entryTags.year + '},\n  editor = {' + res[i].entryTags.editor + '}\n}' + '</td></tr>');
		}
	}

}, 'text');
});



function toggleInfos(articleid,info) {
    var entry = document.getElementById(articleid);
    var abs = document.getElementById('abs_'+articleid);
    var rev = document.getElementById('rev_'+articleid);
    var bib = document.getElementById("bib_"+articleid);

    if ($("#bib_"+articleid).is(":hidden")){
    	$("#bib_"+articleid).show();
    }else{
    	$("#bib_"+articleid).hide();
    }

    if (abs && info == 'abstract') {
      abs.className.indexOf('noshow') == -1?abs.className = 'abstract noshow':abs.className = 'abstract shown';
    } else if (rev && info == 'review') {
      rev.className.indexOf('noshow') == -1?rev.className = 'review noshow':rev.className = 'review shown';
    } else if (bib && info == 'bibtex') {
      bib.className.indexOf('noshow') == -1?bib.className = 'bibtex noshow':bib.className = 'bibtex shown';
    } else { 
      return;
    }

  // check if one or the other is available
  var revshow; var absshow; var bibshow;
  (abs && abs.className.indexOf('noshow') == -1)? absshow = true: absshow = false;
  (rev && rev.className.indexOf('noshow') == -1)? revshow = true: revshow = false;  
  (bib && bib.className.indexOf('noshow') == -1)? bibshow = true: bibshow = false;
  
  // highlight original entry
  if(entry) {
    if (revshow || absshow || bibshow) {
      entry.className = 'entry highlight shown';
    } else {
      entry.className = 'entry shown';
    }
  }
}


// Function for smooth scroll on links
$(document).ready(function(){
  // Add smooth scrolling to all links
  $("a").on('click', function(event) {

    // Make sure this.hash has a value before overriding default behavior
    if (this.hash !== "") {
      // Prevent default anchor click behavior
      event.preventDefault();

      // Store hash
      var hash = this.hash;

      // Using jQuery's animate() method to add smooth page scroll
      // The optional number (800) specifies the number of milliseconds it takes to scroll to the specified area
      $('html, body').animate({
        scrollTop: $(hash).offset().top
      }, 800, function(){

        // Add hash (#) to URL when done scrolling (default click behavior)
        window.location.hash = hash;
      });
    } // End if
  });
});


// Function for load a highlited info if necessary
$(document).ready(function(){
  $.getJSON("jsons/highlight.json", function(data){
  	console.log(data.news.length);
   	if (data.news.length>0){
   		link_string = '';
   		if (data.news[0].link != ''){
   			link_string = ' <a href="' + data.news[0].link + '" target="blank_">' + data.news[0].link_text + '</a>'
   		}
   		$("#highlight_news").append('<div class="alert alert-success" role="alert"><B>' + data.news[0].date + ' - ' + data.news[0].title + ':</B> ' + data.news[0].description + '.' + link_string + '</div>');
   	}
   });
});
