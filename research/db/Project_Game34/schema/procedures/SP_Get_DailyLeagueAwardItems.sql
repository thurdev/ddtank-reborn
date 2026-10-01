-- SQL_STORED_PROCEDURE dbo.SP_Get_DailyLeagueAwardItems (modified 2021-06-04T01:29:18.010)
-- =============================================
-- Author:		<bTh>
-- Create date: <12/11/2017 05:55:08>
-- Description:	<Pega as informações dos itens da liga>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Get_DailyLeagueAwardItems]
AS
BEGIN
SELECT * FROM DailyLeagueAwardItems
END

GO
