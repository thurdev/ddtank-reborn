-- SQL_STORED_PROCEDURE dbo.SP_Daily_Award_Single (modified 2021-06-04T01:29:17.910)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Daily_Award_Single]
    @awardDays int
AS  
 select *  from Daily_Award WHERE AwardDays = @awardDays









GO
