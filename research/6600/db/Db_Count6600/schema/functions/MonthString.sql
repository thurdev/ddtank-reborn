-- SQL_SCALAR_FUNCTION dbo.MonthString (modified 2025-11-03T04:46:08.190)




CREATE  FUNCTION [dbo].[MonthString](@beginday DateTime,@endday DateTime,@field varchar(100), @tablename varchar(30),@where varchar(30))
    RETURNS Varchar(4000)
AS
Begin
   Declare  @MonthSql Varchar(4000)
   Declare @temp Varchar(300)
   Declare @beginData Int
   Declare @endData Int
   Set @temp='select '+@field+' 0'
   If(Convert(char(7),@beginday,120)=Convert(char(7),@endday,120))--相同月份
      Begin        
        While(day(@beginday)<=day(@endday) and (Convert(char(7),@beginday,120)=Convert(char(7),@endday,120)))
             Begin                 
                 Set @temp=@temp+'+day'+Cast(Day(@beginday) as Varchar(2))                 
                 set @beginday= DateAdd(Day,1,@beginday)
             End
        set @MonthSql=@temp+' as data   from '+@tablename+' where '+@where+' and loginmonth='''+Convert(char(7),@endday,120)+''''
      End
   Else                                                                 --不同月份
      Begin
        --1、算出第一个月
        Set @endData=32-day(@beginday+(32-Day(@beginday)))     
        Set @beginData=day(@beginday)
        While(@beginData<=@endData)
             Begin
                 Set @temp=@temp+'+day'+Cast(@beginData as Varchar(2))                 
                 set @beginData= @beginData+1                
             End
        set @MonthSql=@temp+' as data    from '+@tablename+' where loginmonth='''+Convert(char(7),@beginday,120)+''' and ' +@where 
        --2、算出中间月份
        set @MonthSql=@MonthSql+' union all select '+@field+' day1+day2+day3+day4+day5+day6+day7+day8+day9+day10+day11+day12+day13+day14+day15+day16+day17+day18+day19+day20+day21+day22+day23+day24+day25+day26+day27+day28+day29+day30 from '+@tablename+'  where '+@where + ' and loginmonth>'''+convert(char(7),@beginday,120)+''' and loginmonth<'''+convert(char(7),@endday,120)+''''
        --3、算出最后月份
        Set @temp=' union all select '+@field+'0'
        Set @endData=day(@endday)     
        Set @beginData=1
        While(@beginData<=@endData)
             Begin
                 Set @temp=@temp+'+day'+Cast(@beginData as Varchar(2))                 
                 set @beginData= @beginData+1                
             End
        set @MonthSql=@MonthSql+@temp+' from '+@tablename+' where loginmonth='''+Convert(char(7),@endday,120)+''' and ' +@where 
      End
 
    RETURN @MonthSql

End





GO
