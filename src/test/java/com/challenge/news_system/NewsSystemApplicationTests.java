package com.challenge.news_system;

import com.challenge.news_system.service.NewsRssScheduler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class NewsSystemApplicationTests {

	@Autowired
	private NewsRssScheduler newsRssScheduler;

	@Test
	void contextLoads() {
	}

	@Test
	void testDndTimeCrossMidnight() {
		// DND spans midnight: 23:00 to 11:00
		String dndTime = "23:00-11:00";
		
		// 9:15 AM - inside DND
		assertTrue(newsRssScheduler.isTimeInDnd(LocalTime.of(9, 15), dndTime));
		
		// 11:00 AM - inside DND (edge)
		assertTrue(newsRssScheduler.isTimeInDnd(LocalTime.of(11, 0), dndTime));
		
		// 11:01 AM - outside DND
		assertFalse(newsRssScheduler.isTimeInDnd(LocalTime.of(11, 1), dndTime));
		
		// 3:00 PM - outside DND
		assertFalse(newsRssScheduler.isTimeInDnd(LocalTime.of(15, 0), dndTime));
		
		// 11:00 PM - inside DND (edge)
		assertTrue(newsRssScheduler.isTimeInDnd(LocalTime.of(23, 0), dndTime));
		
		// 11:30 PM - inside DND
		assertTrue(newsRssScheduler.isTimeInDnd(LocalTime.of(23, 30), dndTime));
	}

	@Test
	void testDndTimeSameDay() {
		// DND does not span midnight: 09:00 to 18:00
		String dndTime = "09:00-18:00";
		
		// 8:59 AM - outside DND
		assertFalse(newsRssScheduler.isTimeInDnd(LocalTime.of(8, 59), dndTime));
		
		// 9:00 AM - inside DND (edge)
		assertTrue(newsRssScheduler.isTimeInDnd(LocalTime.of(9, 0), dndTime));
		
		// 12:00 PM - inside DND
		assertTrue(newsRssScheduler.isTimeInDnd(LocalTime.of(12, 0), dndTime));
		
		// 6:00 PM - inside DND (edge)
		assertTrue(newsRssScheduler.isTimeInDnd(LocalTime.of(18, 0), dndTime));
		
		// 6:01 PM - outside DND
		assertFalse(newsRssScheduler.isTimeInDnd(LocalTime.of(18, 1), dndTime));
	}

	@Test
	void testDndDisabled() {
		String dndTime = "-";
		assertFalse(newsRssScheduler.isTimeInDnd(LocalTime.of(0, 0), dndTime));
		assertFalse(newsRssScheduler.isTimeInDnd(LocalTime.of(12, 0), dndTime));
		assertFalse(newsRssScheduler.isTimeInDnd(LocalTime.of(23, 59), dndTime));
	}
}
