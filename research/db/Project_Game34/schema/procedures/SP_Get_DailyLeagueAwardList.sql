-- SQL_STORED_PROCEDURE dbo.SP_Get_DailyLeagueAwardList (modified 2021-06-04T01:29:18.017)
-- =============================================
-- Author:		<bTh>
-- Create date: <12/11/2017 05:57:39>
-- Description:	<Pega as informações das listas da liga>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Get_DailyLeagueAwardList]
AS
BEGIN
SELECT * FROM DailyLeagueAwardList
END

GO
